export function wrapCommand(
  command: (
    workspaceOrEditor: Workspace | TextEditor,
    ...args: Transferrable[]
  ) => void | Promise<void>,
): (workspace: Workspace, ...args: Transferrable[]) => void {
  return async function wrapped(
    workspaceOrEditor: Workspace | TextEditor,
    ...args: Transferrable[]
  ) {
    try {
      await command(workspaceOrEditor, ...args);
    } catch (err) {
      nova.workspace.showErrorMessage(err);
    }
  };
}

export async function openFile(uri: string) {
  const newEditor = await nova.workspace.openFile(uri);
  if (newEditor) {
    return newEditor;
  }
  console.warn("failed first open attempt, retrying once", uri);
  // try one more time, this doesn't resolve if the file isn't already open. Need to file a bug
  return await nova.workspace.openFile(uri);
}

export function isWorkspace(val: Workspace | TextEditor): val is Workspace {
  if ("activeTextEditor" in val) {
    return true;
  }

  return false;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
const filePrefix = new RegExp("^" + escapeRegExp("file://"));

const hr = new RegExp("^" + escapeRegExp(`file://${nova.environment["HOME"]}`));
const stdVolumePrefix = new RegExp(
  "^" + escapeRegExp("file:///Volumes/Macintosh HD"),
);
export function cleanPath(path: string) {
  path = decodeURIComponent(path);
  if (nova.workspace.path) {
    path = path.replace(
      new RegExp("^" + escapeRegExp(`file://${nova.workspace.path}`)),
      ".",
    );
  } else {
    path = path.replace(stdVolumePrefix, "file://");
  }
  return (
    path
      .replace(hr, "~")
      // needs to go last
      .replace(filePrefix, "")
  );
}

export async function showChoicePalette<T>(
  choices: T[],
  choiceToString: (choice: T) => string,
  options?: { placeholder?: string },
) {
  const index = await new Promise<number | null>((resolve) =>
    nova.workspace.showChoicePalette(
      choices.map(choiceToString),
      options,
      (_, index) => {
        resolve(index);
      },
    )
  );
  if (index == null) {
    return null;
  }
  return choices[index];
}
