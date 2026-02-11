import { registerNoteHandlers } from './notes'
import { registerFolderHandlers } from './folders'
import { registerTagHandlers } from './tags'
import { registerLinkHandlers } from './links'
import { registerSettingsHandlers } from './settings'

export function registerAllHandlers() {
  registerNoteHandlers()
  registerFolderHandlers()
  registerTagHandlers()
  registerLinkHandlers()
  registerSettingsHandlers()
}
