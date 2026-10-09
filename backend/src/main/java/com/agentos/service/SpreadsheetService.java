package com.agentos.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.agentos.security.AgentOsAccessPolicy;

@Service
public class SpreadsheetService {
    private static final int MAX_PREVIEW_ROWS = 500;
    private static final int MAX_ROWS = 20_000;
    private final FileSystemService fileSystem;
    private final AgentOsAccessPolicy accessPolicy;

    public SpreadsheetService(FileSystemService fileSystem, AgentOsAccessPolicy accessPolicy) {
        this.fileSystem = fileSystem;
        this.accessPolicy = accessPolicy;
    }

    public List<Map<String, Object>> allTools() {
        return List.of(
                tool("create_spreadsheet", "Create a CSV spreadsheet with a header row and optional data rows.",
                        Map.of("path", "string", "headers", "array", "rows", "array"), List.of("path", "headers")),
                tool("read_spreadsheet", "Read a CSV spreadsheet and return its headers and a bounded row preview.",
                        Map.of("path", "string"), List.of("path")),
                tool("append_spreadsheet_row", "Append one row to a CSV spreadsheet.",
                        Map.of("path", "string", "values", "array"), List.of("path", "values")),
                tool("filter_spreadsheet", "Filter CSV rows by a column name or zero-based column index.",
                        Map.of("path", "string", "column", "string", "value", "string"), List.of("path", "column", "value")));
    }

    public List<Map<String, Object>> tools() {
        return allTools().stream().filter(tool -> accessPolicy.isAllowed("spreadsheets." + tool.get("name"))).toList();
    }

    public FileSystemService.ToolOutput execute(String tool, Map<String, Object> input) throws IOException {
        accessPolicy.require("spreadsheets." + tool);
        String path = string(input, "path");
        requireCsvPath(path);
        return switch (tool) {
            case "create_spreadsheet" -> create(path, input);
            case "read_spreadsheet" -> read(path);
            case "append_spreadsheet_row" -> append(path, input);
            case "filter_spreadsheet" -> filter(path, input);
            default -> throw new IllegalArgumentException("Unsupported spreadsheet operation: " + tool);
        };
    }

    private FileSystemService.ToolOutput create(String path, Map<String, Object> input) throws IOException {
        List<String> headers = stringList(input.get("headers"), "headers");
        if (headers.isEmpty()) throw new IllegalArgumentException("A spreadsheet needs at least one column header.");
        List<List<String>> rows = new ArrayList<>();
        rows.add(headers);
        Object rawRows = input.get("rows");
        if (rawRows != null) {
            if (!(rawRows instanceof List<?> values)) throw new IllegalArgumentException("Rows must be an array of arrays.");
            if (values.size() > MAX_ROWS) throw new IllegalArgumentException("A spreadsheet can contain at most 20,000 data rows.");
            for (Object rawRow : values) {
                List<String> row = stringList(rawRow, "row");
                validateWidth(row, headers.size());
                rows.add(row);
            }
        }
        return new FileSystemService.ToolOutput(Map.of("path", fileSystem.writeFile(path, encode(rows)), "rows", rows.size() - 1), null);
    }

    private FileSystemService.ToolOutput read(String path) throws IOException {
        List<List<String>> rows = parse(fileSystem.readFile(path));
        if (rows.isEmpty()) return new FileSystemService.ToolOutput(Map.of("path", path, "headers", List.of(), "rows", List.of(), "rowCount", 0, "truncated", false), null);
        List<String> headers = rows.get(0);
        List<List<String>> data = rows.subList(1, rows.size());
        List<List<String>> preview = data.subList(0, Math.min(MAX_PREVIEW_ROWS, data.size()));
        return new FileSystemService.ToolOutput(Map.of("path", path, "headers", headers, "rows", preview,
                "rowCount", data.size(), "truncated", data.size() > preview.size()), null);
    }

    private FileSystemService.ToolOutput append(String path, Map<String, Object> input) throws IOException {
        List<List<String>> rows = parse(fileSystem.readFile(path));
        if (rows.isEmpty()) throw new IllegalArgumentException("The spreadsheet has no header row.");
        if (rows.size() > MAX_ROWS) throw new IllegalArgumentException("This spreadsheet has reached the 20,000 row limit.");
        List<String> values = stringList(input.get("values"), "values");
        validateWidth(values, rows.get(0).size());
        rows.add(values);
        return new FileSystemService.ToolOutput(Map.of("path", fileSystem.writeFile(path, encode(rows)), "rowCount", rows.size() - 1), null);
    }

    private FileSystemService.ToolOutput filter(String path, Map<String, Object> input) throws IOException {
        List<List<String>> rows = parse(fileSystem.readFile(path));
        if (rows.isEmpty()) throw new IllegalArgumentException("The spreadsheet has no header row.");
        List<String> headers = rows.get(0);
        String column = string(input, "column");
        String value = string(input, "value");
        int index = columnIndex(headers, column);
        List<List<String>> matches = rows.subList(1, rows.size()).stream()
                .filter(row -> index < row.size() && row.get(index).equalsIgnoreCase(value))
                .limit(MAX_PREVIEW_ROWS).toList();
        return new FileSystemService.ToolOutput(Map.of("path", path, "headers", headers, "rows", matches,
                "rowCount", matches.size(), "truncated", matches.size() == MAX_PREVIEW_ROWS), null);
    }

    private static int columnIndex(List<String> headers, String column) {
        try {
            int index = Integer.parseInt(column);
            if (index >= 0 && index < headers.size()) return index;
        } catch (NumberFormatException ignored) { }
        for (int i = 0; i < headers.size(); i++) {
            if (headers.get(i).equalsIgnoreCase(column)) return i;
        }
        throw new IllegalArgumentException("Column '" + column + "' was not found.");
    }

    private static List<String> stringList(Object value, String name) {
        if (!(value instanceof List<?> raw)) throw new IllegalArgumentException("'" + name + "' must be an array of strings.");
        List<String> values = new ArrayList<>();
        for (Object item : raw) {
            if (!(item instanceof String text)) throw new IllegalArgumentException("'" + name + "' must contain only strings.");
            values.add(text);
        }
        return values;
    }

    private static String string(Map<String, Object> input, String name) {
        Object value = input.get(name);
        if (!(value instanceof String text)) throw new IllegalArgumentException("A string value is required for '" + name + "'.");
        return text;
    }

    private static void validateWidth(List<String> row, int expected) {
        if (row.size() != expected) throw new IllegalArgumentException("Every spreadsheet row must have " + expected + " values.");
    }

    private static void requireCsvPath(String path) {
        if (!path.toLowerCase(Locale.ROOT).endsWith(".csv")) throw new IllegalArgumentException("Spreadsheets currently use the .csv format.");
    }

    private static List<List<String>> parse(String csv) {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        boolean afterQuote = false;
        boolean rowHasContent = false;
        for (int i = 0; i < csv.length(); i++) {
            char ch = csv.charAt(i);
            if (quoted) {
                if (ch == '"') {
                    if (i + 1 < csv.length() && csv.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        quoted = false;
                        afterQuote = true;
                    }
                } else {
                    field.append(ch);
                }
                continue;
            }
            if (afterQuote && ch != ',' && ch != '\r' && ch != '\n') {
                throw new IllegalArgumentException("The CSV contains unexpected text after a quoted value.");
            }
            if (ch == '"') {
                if (field.length() != 0 || afterQuote) throw new IllegalArgumentException("The CSV contains an unexpected quote.");
                quoted = true;
                rowHasContent = true;
            } else if (ch == ',') {
                row.add(field.toString());
                field.setLength(0);
                afterQuote = false;
                rowHasContent = true;
            } else if (ch == '\r' || ch == '\n') {
                if (ch == '\r' && i + 1 < csv.length() && csv.charAt(i + 1) == '\n') i++;
                row.add(field.toString());
                rows.add(List.copyOf(row));
                row.clear();
                field.setLength(0);
                afterQuote = false;
                rowHasContent = false;
            } else {
                field.append(ch);
                rowHasContent = true;
            }
        }
        if (quoted) throw new IllegalArgumentException("The CSV ends inside a quoted value.");
        if (rowHasContent || field.length() > 0 || !row.isEmpty() || afterQuote) {
            row.add(field.toString());
            rows.add(List.copyOf(row));
        }
        if (rows.size() > MAX_ROWS + 1) throw new IllegalArgumentException("This spreadsheet exceeds the 20,000 row limit.");
        return rows;
    }

    private static String encode(List<List<String>> rows) {
        StringBuilder csv = new StringBuilder();
        for (List<String> row : rows) {
            for (int i = 0; i < row.size(); i++) {
                if (i > 0) csv.append(',');
                String value = row.get(i);
                if (value.contains(",") || value.contains("\"") || value.contains("\r") || value.contains("\n")) {
                    csv.append('"').append(value.replace("\"", "\"\"")).append('"');
                } else {
                    csv.append(value);
                }
            }
            csv.append("\r\n");
        }
        return csv.toString();
    }

    private static Map<String, Object> tool(String name, String description, Map<String, String> fields, List<String> required) {
        Map<String, Object> properties = new LinkedHashMap<>();
        fields.forEach((key, type) -> properties.put(key, Map.of("type", type)));
        return Map.of("name", name, "description", description,
                "inputSchema", Map.of("type", "object", "properties", properties, "required", required));
    }
}
