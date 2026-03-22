/**
 * データベース関連のユーティリティ関数
 */

/**
 * PRAGMA table_info の結果からカラム名を抽出する
 */
export function extractColumnName(row: unknown): string | null {
  if (!row) {
    return null;
  }

  if (Array.isArray(row)) {
    const value = row[1];
    if (typeof value === "string") {
      return value;
    }
    if (value != null) {
      return String(value);
    }
    return null;
  }

  if (typeof row === "object") {
    const record = row as Record<string, unknown>;
    const value = record.name;
    if (typeof value === "string") {
      return value;
    }
    if (value != null) {
      return String(value);
    }
  }

  return null;
}

/**
 * SQL識別子をクォートする（SQLインジェクション対策）
 */
export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * カラムマップから候補リストに一致するカラムを選択する
 */
export function pickColumn(
  columnMap: Map<string, string>,
  candidates: string[],
  { required = false }: { required?: boolean } = {}
): string | undefined {
  for (const candidate of candidates) {
    const column = columnMap.get(candidate.toLowerCase());
    if (column) {
      return column;
    }
  }

  if (required) {
    const available = Array.from(columnMap.values()).join(", ");
    throw new Error(
      `Required column not found. Tried ${candidates.join(", ")} in table with columns: ${available}`
    );
  }

  return undefined;
}

/**
 * PRAGMA table_info の結果からカラムマップを作成する
 */
export function buildColumnMap(
  rows: Array<Record<string, unknown> | unknown[]>
): Map<string, string> {
  const columnMap = new Map<string, string>();

  for (const row of rows) {
    const name = extractColumnName(row);
    if (name) {
      columnMap.set(name.toLowerCase(), name);
    }
  }

  return columnMap;
}
