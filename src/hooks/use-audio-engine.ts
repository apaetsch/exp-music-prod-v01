"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Layer } from "@/types/session";

interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

interface LayerAudioNode {
  gainNode: GainNode;
  buffer: AudioBuffer | null;
  sourceNode: AudioBufferSourceNode | null;
}

export function useAudioEngine(layers: Layer[]) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const layerNodesRef = useRef<Map<string, LayerAudioNode>>(new Map());
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const [state, setState] = useState<AudioEngineState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });

  // Initialize AudioContext on first interaction
  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.connect(ctxRef.current.destination);
    }
    return ctxRef.current;
  }, []);

  // Load audio for a layer from URL
  const loadLayerAudio = useCallback(
    async (layerId: string, audioUrl: string) => {
      const ctx = getContext();
      const res = await fetch(audioUrl);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      let node = layerNodesRef.current.get(layerId);
      if (!node) {
        const gainNode = ctx.createGain();
        gainNode.connect(masterGainRef.current!);
        node = { gainNode, buffer: null, sourceNode: null };
        layerNodesRef.current.set(layerId, node);
      }
      node.buffer = audioBuffer;

      // Update duration to longest layer
      let maxDuration = 0;
      layerNodesRef.current.forEach((n) => {
        if (n.buffer && n.buffer.duration > maxDuration) {
          maxDuration = n.buffer.duration;
        }
      });
      setState((prev) => ({ ...prev, duration: maxDuration }));
    },
    [getContext]
  );

  // Sync layer gain/mute/solo with current layer state
  useEffect(() => {
    const hasSoloed = layers.some((l) => l.isSoloed);

    layers.forEach((layer) => {
      const node = layerNodesRef.current.get(layer.id);
      if (!node) return;

      let targetVolume = layer.volume;
      if (layer.isMuted) {
        targetVolume = 0;
      } else if (hasSoloed && !layer.isSoloed) {
        targetVolume = 0;
      }

      node.gainNode.gain.value = targetVolume;
    });
  }, [layers]);

  // Check for new ready layers and load their audio
  useEffect(() => {
    layers.forEach((layer) => {
      if (layer.status === "ready" && layer.currentVersionId) {
        const version = layer.versions.find(
          (v) => v.id === layer.currentVersionId
        );
        if (version) {
          const node = layerNodesRef.current.get(layer.id);
          // Only load if we don't have a buffer yet or version changed
          if (!node || !node.buffer) {
            loadLayerAudio(layer.id, version.audioUrl);
          }
        }
      }
    });
  }, [layers, loadLayerAudio]);

  // Play all layers simultaneously
  const play = useCallback(() => {
    const ctx = getContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Stop any existing sources
    layerNodesRef.current.forEach((node) => {
      if (node.sourceNode) {
        try {
          node.sourceNode.stop();
        } catch {
          // already stopped
        }
        node.sourceNode = null;
      }
    });

    startTimeRef.current = ctx.currentTime;

    // Create and start source nodes for all layers with audio
    layerNodesRef.current.forEach((node) => {
      if (node.buffer) {
        const source = ctx.createBufferSource();
        source.buffer = node.buffer;
        source.connect(node.gainNode);
        source.start(0);
        node.sourceNode = source;
      }
    });

    setState((prev) => ({ ...prev, isPlaying: true }));

    // Update currentTime via animation frame
    const tick = () => {
      const elapsed = ctx.currentTime - startTimeRef.current;
      setState((prev) => ({ ...prev, currentTime: elapsed }));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [getContext]);

  // Stop all playback
  const stop = useCallback(() => {
    layerNodesRef.current.forEach((node) => {
      if (node.sourceNode) {
        try {
          node.sourceNode.stop();
        } catch {
          // already stopped
        }
        node.sourceNode = null;
      }
    });

    cancelAnimationFrame(animFrameRef.current);
    setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  // Toggle play/stop
  const togglePlayback = useCallback(() => {
    if (state.isPlaying) {
      stop();
    } else {
      play();
    }
  }, [state.isPlaying, play, stop]);

  // Remove layer node when layer is removed
  const removeLayer = useCallback((layerId: string) => {
    const node = layerNodesRef.current.get(layerId);
    if (node) {
      if (node.sourceNode) {
        try {
          node.sourceNode.stop();
        } catch {
          // already stopped
        }
      }
      node.gainNode.disconnect();
      layerNodesRef.current.delete(layerId);
    }
  }, []);

  return {
    ...state,
    togglePlayback,
    play,
    stop,
    loadLayerAudio,
    removeLayer,
  };
}
