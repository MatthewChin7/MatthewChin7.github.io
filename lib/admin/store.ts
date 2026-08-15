/**
 * The admin store bound to the working tree on this machine.
 *
 * Server-only: imported by the dev-only /admin route handler and the unit
 * tests. The storage-agnostic logic lives in `lib/admin/store-core`; the
 * browser build of the studio binds the same logic to a GitHub-backed
 * snapshot instead (see `lib/admin/github/`).
 */
import { createNodeVfs } from "@/lib/admin/node-vfs";
import { createStore } from "@/lib/admin/store-core";

const store = createStore(createNodeVfs());

export const {
  listItems,
  readItem,
  saveItem,
  deleteItem,
  listTrash,
  restoreTrash,
  emptyTrash,
  setDraft,
  duplicateItem,
  hasLatexProject,
  readLatexProject,
  listLatexProjects,
  deleteLatexProject,
  saveLatexProject,
  deleteLatexFile,
  renameLatexProject,
  listMedia,
  deleteMedia,
  mediaUsage,
  mediaDestination,
  publicUrl,
} = store;

export {
  BIB_FILE,
  CONTENT_KINDS,
  MAIN_TEX,
  deriveDescription,
  isContentKind,
  slugify,
  storeLabel,
  today,
  wordCount,
  type AdminItem,
  type ContentKind,
  type ItemDoc,
  type MediaFile,
  type SaveOutcome,
  type TrashEntry,
} from "@/lib/admin/store-core";
