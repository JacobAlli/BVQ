import React from 'react';

interface ControlPanelProps {
  channelName: string;
  isOpen: boolean;
  format: string;
}

export default function ControlPanel({ channelName, isOpen, format }: ControlPanelProps) {
  return (
    <div className="bg-bvq-card rounded-lg border border-bvq-border p-4">
      <h2 className="text-lg font-semibold mb-4 text-bvq-accent">Controls</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-bvq-text-dim">Status</span>
          <span className={`font-mono font-bold ${isOpen ? 'text-bvq-green' : 'text-bvq-red'}`}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-bvq-text-dim">Format</span>
          <span className="font-mono font-bold text-bvq-accent">{format}</span>
        </div>

        <hr className="border-bvq-border" />

        <p className="text-xs text-bvq-text-dim italic">
          Controls are managed via Twitch chat commands.
          Use !queue open/close, !balance, !next, !reroll, !format in chat.
        </p>
      </div>
    </div>
  );
}
