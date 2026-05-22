import { useCallback, useRef } from 'react'

export function useFileInputs(
  onImportFiles: (files: FileList) => void,
  onAddVideos: (playlistId: string, files: FileList) => void,
) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const addVideoInputRef = useRef<HTMLInputElement>(null)
  const addVideoTargetRef = useRef<string | null>(null)

  const triggerImport = useCallback(() => {
    importInputRef.current?.click()
  }, [])

  const triggerAddVideo = useCallback((playlistId: string) => {
    addVideoTargetRef.current = playlistId
    addVideoInputRef.current?.click()
  }, [])

  const onImportChange = useCallback(
    (files: FileList | null) => {
      if (files?.length) onImportFiles(files)
    },
    [onImportFiles],
  )

  const onAddChange = useCallback(
    (files: FileList | null) => {
      const targetId = addVideoTargetRef.current
      if (files?.length && targetId) onAddVideos(targetId, files)
      addVideoTargetRef.current = null
    },
    [onAddVideos],
  )

  return {
    importInputRef,
    addVideoInputRef,
    triggerImport,
    triggerAddVideo,
    onImportChange,
    onAddChange,
  }
}
