import type { RefObject } from 'react'
import { MEDIA_ACCEPT } from '@/lib/constants'

interface HiddenFileInputsProps {
  importInputRef: RefObject<HTMLInputElement | null>
  addVideoInputRef: RefObject<HTMLInputElement | null>
  onImportChange: (files: FileList | null) => void
  onAddChange: (files: FileList | null) => void
}

export function HiddenFileInputs({
  importInputRef,
  addVideoInputRef,
  onImportChange,
  onAddChange,
}: HiddenFileInputsProps) {
  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        className="app__file-input"
        accept={MEDIA_ACCEPT}
        // @ts-expect-error webkitdirectory
        webkitdirectory=""
        directory=""
        multiple
        onChange={(e) => {
          onImportChange(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={addVideoInputRef}
        type="file"
        className="app__file-input"
        accept={MEDIA_ACCEPT}
        multiple
        onChange={(e) => {
          onAddChange(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )
}
