import { registerNoteHandlers } from './notes'
import { registerFolderHandlers } from './folders'
import { registerTagHandlers } from './tags'
import { registerLinkHandlers } from './links'
import { registerSettingsHandlers } from './settings'
import { registerAIHandlers } from '../ai'

export function registerAllHandlers() {
  registerNoteHandlers()
  registerFolderHandlers()
  registerTagHandlers()
  registerLinkHandlers()
  registerSettingsHandlers()
  registerAIHandlers()
}
