export interface VideoItem {
  id: string
  file: File
  name: string
  displayTitle: string
  relativePath: string
  folderPath: string
  url: string
  thumbnail: string | null
  isAudio: boolean
  duration: number
  durationLabel: string
  width: number
  height: number
  resolution: string
  aspectRatio: string
}
