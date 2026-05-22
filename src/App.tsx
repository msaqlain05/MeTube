import { useCallback, useState } from 'react'
import { TopBar } from '@/components/TopBar'
import { WatchPanel } from '@/components/WatchPanel'
import { PlaylistRail } from '@/components/PlaylistRail'
import { AppDrawer } from '@/components/AppDrawer'
import { ResizeHandle } from '@/components/ResizeHandle'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import { HiddenFileInputs } from '@/components/HiddenFileInputs'
import { usePlaylistStore } from '@/hooks/usePlaylistStore'
import { usePanelResize } from '@/hooks/usePanelResize'
import { useFileInputs } from '@/hooks/useFileInputs'
import './App.css'

function App() {
  const store = usePlaylistStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [search, setSearch] = useState('')

  const panel = usePanelResize()

  const handleImportFiles = useCallback(
    (files: FileList) => {
      store.importFromFiles(files)
    },
    [store],
  )

  const handleAddVideos = useCallback(
    (playlistId: string, files: FileList) => {
      store.addVideosToPlaylist(playlistId, files)
    },
    [store],
  )

  const files = useFileInputs(handleImportFiles, handleAddVideos)

  const triggerImport = useCallback(async () => {
    const result = await store.importFolder()
    if (result === 'use-input') files.triggerImport()
  }, [store, files])

  const handleWatchProgress = useCallback(
    (position: number, duration: number, force?: boolean) => {
      const video = store.activeVideo
      const playlistId = store.activePlaylistId
      if (video && playlistId) {
        store.recordWatchProgress(video.id, position, duration, force)
      }
    },
    [store],
  )

  const handleRemoveVideo = useCallback(
    (videoId: string) => {
      if (store.activePlaylistId) {
        store.removeVideoFromPlaylist(store.activePlaylistId, videoId)
      }
    },
    [store],
  )

  const resumePosition =
    store.activeVideo && store.activePlaylistId
      ? store.getResumeForVideo(
          store.activeVideo.id,
          store.activeVideo.duration,
        )
      : null

  return (
    <div className="app">
      <HiddenFileInputs
        importInputRef={files.importInputRef}
        addVideoInputRef={files.addVideoInputRef}
        onImportChange={files.onImportChange}
        onAddChange={files.onAddChange}
      />

      <CreatePlaylistModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(name) => {
          store.createPlaylist(name)
          setShowCreateModal(false)
        }}
      />

      <TopBar
        search={search}
        onSearchChange={setSearch}
        onMenuClick={() => setDrawerOpen(true)}
        onImportFolder={triggerImport}
        onNewPlaylist={() => setShowCreateModal(true)}
        onAddVideo={() => {
          if (store.activePlaylistId) files.triggerAddVideo(store.activePlaylistId)
        }}
        hasActivePlaylist={!!store.activePlaylistId}
      />

      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        playlists={store.playlists}
        activePlaylistId={store.activePlaylistId}
        onSelectPlaylist={store.selectPlaylist}
        onRemovePlaylist={store.removePlaylist}
        onImportFolder={triggerImport}
        onNewPlaylist={() => {
          setShowCreateModal(true)
          setDrawerOpen(false)
        }}
        onAddVideo={files.triggerAddVideo}
      />

      <div
        ref={panel.bodyRef}
        className={panel.bodyClassName}
        style={panel.bodyStyle}
      >
        <WatchPanel
          video={store.activeVideo}
          loading={store.loading}
          needsRelink={store.needsRelink}
          canGrantFolderAccess={store.canGrantFolderAccess}
          resumePosition={resumePosition}
          onGrantFolderAccess={store.grantFolderAccess}
          onRelinkClick={store.relinkFolder}
          onEnded={store.playNext}
          onWatchProgress={handleWatchProgress}
        />

        <ResizeHandle
          orientation={panel.useSideResize ? 'vertical' : 'horizontal'}
          label="Resize video and playlist panels"
          dragging={panel.activeResize.dragging}
          onPointerDown={panel.activeResize.onPointerDown}
          onKeyDown={panel.activeResize.onKeyDown}
          onDoubleClick={panel.activeResize.reset}
        />

        <div
          className={`app__rail-pane${panel.isStackedPortrait ? ' app__rail-pane--stacked' : ''}`}
        >
          <PlaylistRail
            playlist={store.activePlaylist}
            videos={store.videos}
            activeId={store.activePlaylist?.activeVideoId ?? null}
            search={search}
            onSearchChange={setSearch}
            importError={store.importError}
            onSelectVideo={store.selectVideo}
            onRemoveVideo={handleRemoveVideo}
            getWatchPercent={store.getVideoWatchPercent}
          />
        </div>
      </div>
    </div>
  )
}

export default App
