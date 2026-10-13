'use client';

import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { InputView } from '../components/InputView';
import { PlaylistView } from '../components/PlaylistView';
import { ParsedPlaylist } from '../types/playlist';

export default function Home() {
  const [playlist, setPlaylist] = useState<ParsedPlaylist | null>(null);

  const handleGenerate = (newPlaylist: ParsedPlaylist) => {
    setPlaylist(newPlaylist);
  };

  const handleReset = () => {
    setPlaylist(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fffefb] text-[#201515]">
      <Navbar
        onReset={handleReset}
        showReset={playlist !== null}
        videoTitle={playlist?.video.title}
      />

      <main className="flex-1 flex flex-col justify-start">
        {!playlist ? (
          <InputView onGenerate={handleGenerate} />
        ) : (
          <PlaylistView playlist={playlist} onReset={handleReset} />
        )}
      </main>

      <footer className="border-t border-[#c5c0b1]/30 py-6 px-4 text-center text-xs text-[#605d52]">
        <p>Local-first YouTube Chaptered Playlist Creator • Runs in your browser without cloud tracking</p>
      </footer>
    </div>
  );
}
