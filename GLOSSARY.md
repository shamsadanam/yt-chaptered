# YouTube Chaptered Player

Video playback and chapter learning environment designed for structured educational content.

## Player Language

**Fullscreen Overlay**:
The transient user interface rendered over the video player when in fullscreen mode, which automatically hides during periods of user inactivity.
_Avoid_: Fullscreen modal, player chrome

**Transport Bar**:
The bottom control interface hosting the timeline scrubber, playback navigation, and player utility controls.
_Avoid_: Control bar, bottom footer, player bar

**Top Header**:
The top overlay layer displaying course and video identity information and high-level context.
_Avoid_: Navbar, player header, title bar

**Transport Controls**:
The primary playback controls used to alter playback flow: Previous Chapter, Rewind 10s, Play/Pause, Forward 10s, and Next Chapter.
_Avoid_: Player buttons, playback buttons

**Utility Controls**:
Secondary player tools and settings: Volume slider, Playback Speed menu, Captions toggle, Chapter Drawer trigger, Control Lock toggle, and Fullscreen toggle.
_Avoid_: Secondary actions, accessory buttons

**Chapter Completion Toggle**:
The interactive status control allowing users to toggle completion state for the currently active chapter.
_Avoid_: Mark complete button, chapter checkbox

**Progress Scrubber**:
The interactive timeline slider indicating current playback position with chapter demarcation notches and timestamp preview.
_Avoid_: Seekbar, progress bar, timeline slider

**Chapter Drawer**:
The slide-out navigation panel presenting the complete sequence of course chapters with search, filter, and completion indicators.
_Avoid_: Chapter sidebar, playlist drawer

**Control Lock**:
The state and mechanism that disables all touch and pointer interactions on the player overlay to prevent accidental inputs during playback, showing only an unlock trigger on touch.
_Avoid_: Screen lock, touch lock, child lock

**Theater Mode**:
A viewing layout on non-mobile viewports where the video player expands to span the full primary container width while collapsing or repositioning the chapter sidebar below.
_Avoid_: Cinema mode, wide view, large player

**Sticky Player Bar**:
The pinned mobile video and playback header that maintains playback access while users scroll the chapter list.
_Avoid_: Floating mobile player, sticky header

**Viewport Anchor**:
Viewport containment rules preventing mobile browsers from zooming out to desktop scale during orientation shifts or background restoration.
_Avoid_: Desktop mode glitch, zoom lock
