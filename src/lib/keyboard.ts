/** Returns true when global player shortcuts should not run */
export function shouldIgnorePlayerKeyboard(e: KeyboardEvent): boolean {
  const t = e.target
  if (!(t instanceof HTMLElement)) return false
  if (
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    t instanceof HTMLSelectElement
  ) {
    return true
  }
  if (t.isContentEditable) return true
  if (t.getAttribute('role') === 'separator') return true
  if (t.closest('.drawer, .modal-overlay, .topbar__search')) return true
  return false
}
