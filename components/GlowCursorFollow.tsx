"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CursorProvider,
  CursorFollow,
} from "@/components/animate-ui/components/animate/cursor";

export type GlowCursorFollowProps = {
  color?: string;
  size?: number;
  transition?: {
    type?: "spring" | "tween";
    damping?: number;
    stiffness?: number;
  };
};

// Head = circle at (0,0). Tail trails toward +x when rotation = 0.
// So "forward" (where the head points) is -x by default, i.e. 180°.
const swimFrames = [
  "M -10,0 C -8,-10 8,-10 10,0 C 20,4 40,14 60,6 C 50,2 34,0 24,0 C 34,0 50,-2 60,-6 C 40,-14 20,-4 10,0 C 8,10 -8,10 -10,0 Z",
  "M -10,0 C -8,-10 8,-10 10,0 C 22,-6 42,-18 58,-14 C 46,-4 32,2 22,2 C 32,2 46,8 58,16 C 42,20 22,8 10,0 C 8,10 -8,10 -10,0 Z",
  "M -10,0 C -8,-10 8,-10 10,0 C 18,10 36,20 55,18 C 44,8 30,2 20,0 C 30,-2 44,-10 55,-20 C 36,-18 18,-10 10,0 C 8,10 -8,10 -10,0 Z",
  "M -10,0 C -8,-10 8,-10 10,0 C 20,4 40,14 60,6 C 50,2 34,0 24,0 C 34,0 50,-2 60,-6 C 40,-14 20,-4 10,0 C 8,10 -8,10 -10,0 Z",
];

const normalizeDelta = (delta: number) => {
  // wrap delta into [-180, 180] so we always turn the short way
  let d = delta % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};

// Returns a continuous (un-wrapped) rotation in degrees that always points
// the shape toward the current direction of mouse travel, in any direction.
function useCursorFacingRotation() {
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (lastPos.current) {
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 3) {
          const travelAngle = Math.atan2(dy, dx) * (180 / Math.PI);
          const targetRotation = travelAngle - 180; // shift so head (default 180°) aligns with travel angle
          const delta = normalizeDelta(targetRotation - rotationRef.current);
          rotationRef.current += delta;
          setRotation(rotationRef.current);
        }
      }
      lastPos.current = { x: e.clientX, y: e.clientY };

      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        lastPos.current = null;
      }, 150);
    }

    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      clearTimeout(idleTimer.current);
    };
  }, []);

  return rotation;
}

export default function GlowCursorFollow({
  color = "#00ffff",
  size = 16,
  transition = { type: "spring", damping: 20, stiffness: 100 },
}: GlowCursorFollowProps) {
  const scale = size / 20;
  const rotation = useCursorFacingRotation();

  return (
    <CursorProvider>
      {/* Notice: we removed <Cursor /> so the native mouse pointer stays visible */}
      <CursorFollow transition={transition}>
        <motion.svg
          width={90 * scale}
          height={50 * scale}
          viewBox="-20 -22 90 44"
          style={{
            overflow: "visible",
            filter: `drop-shadow(0 0 ${size * 0.6}px ${color}) drop-shadow(0 0 ${size * 1.4}px ${color}80)`,
          }}
          animate={{ rotate: rotation }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <defs>
            <radialGradient id="tadpole-grad" cx="30%" cy="50%" r="70%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="60%" stopColor={color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Tail — whips independently of the facing rotation above */}
          <motion.path
            d={swimFrames[0]}
            fill="url(#tadpole-grad)"
            animate={{ d: swimFrames }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Head */}
          <circle cx="0" cy="0" r={5} fill={color} opacity={0.95} />
        </motion.svg>
      </CursorFollow>
    </CursorProvider>
  );
}
