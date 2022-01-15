import { LSP } from "../deps.ts";
import { nova, Range, TextDocument, TextEditor } from "./nova.ts";
import { openFile } from "./utils.ts";

export function applyLSPEdits(
  editor: TextEditor,
  edits: Array<LSP.TextEdit>,
) {
  editor.edit((textEditorEdit) => {
    for (const change of edits.reverse()) {
      const range = lspRangeToRange(editor.document, change.range);
      textEditorEdit.replace(range, change.newText);
    }
  });
}

/**
 * Applies LSP workspace edits to a Nove workspace.
 * Will use the documentChanges property if available, and fallback to the deprecated changes property.
 * Does not suuport CreateFile, RenameFile, or DeleteFile operations
 * @param workspaceEdit - The edit provided by the LSP.
 */
export async function applyWorkspaceEdit(
  workspaceEdit: LSP.WorkspaceEdit,
) {
  if (workspaceEdit.documentChanges) {
    // Look for the newer documentChanges property first
    for (const change of workspaceEdit.documentChanges || []) {
      // TODO: Suuport Create, Rename, Delete
      if (!("edits" in change)) {
        continue;
      }

      if ("edits" in change && change.edits.length === 0) {
        continue;
      }

      const editor = await openFile(change.textDocument.uri);

      if (!editor) {
        nova.workspace.showWarningMessage(
          `Failed to open ${change.textDocument.uri}`,
        );
        continue;
      }

      applyLSPEdits(editor, change.edits);
    }
  } // then fall back to the deprecated changes property
  else if (workspaceEdit.changes) {
    for (const uri in workspaceEdit.changes) {
      const changes = workspaceEdit.changes[uri];
      if (!changes.length) {
        continue;
      }
      const editor = await openFile(uri);
      if (!editor) {
        nova.workspace.showWarningMessage(`Failed to open ${uri}`);
        continue;
      }

      applyLSPEdits(editor, changes);
    }
  }
}

//

export function rangeToLspRange(
  document: TextDocument,
  range: Range,
): LSP.Range | null {
  const fullContents = document.getTextInRange(new Range(0, document.length));
  let chars = 0;
  let startLspRange: LSP.Position | undefined;
  const lines = fullContents.split(document.eol);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineLength = lines[lineIndex].length + document.eol.length;
    if (!startLspRange && chars + lineLength >= range.start) {
      const character = range.start - chars;
      startLspRange = { line: lineIndex, character };
    }
    if (startLspRange && chars + lineLength >= range.end) {
      const character = range.end - chars;
      return { start: startLspRange, end: { line: lineIndex, character } };
    }
    chars += lineLength;
  }
  return null;
}

export function lspRangeToRange(
  document: TextDocument,
  range: LSP.Range,
): Range {
  const fullContents = document.getTextInRange(new Range(0, document.length));
  let rangeStart = 0;
  let rangeEnd = 0;
  let chars = 0;
  const lines = fullContents.split(document.eol);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineLength = lines[lineIndex].length + document.eol.length;
    if (range.start.line === lineIndex) {
      rangeStart = chars + range.start.character;
    }
    if (range.end.line === lineIndex) {
      rangeEnd = chars + range.end.character;
      break;
    }
    chars += lineLength;
  }
  return new Range(rangeStart, rangeEnd);
}
