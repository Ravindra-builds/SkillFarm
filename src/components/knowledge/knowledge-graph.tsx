"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Network,
  Sparkles,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  BookOpen,
  Hammer,
  MessageSquare,
  CheckCircle2,
  Lock,
  Search,
  BrainCircuit,
  Crosshair,
  Move,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import type { Roadmap, RoadmapNode } from "@/lib/roadmap-store";

type NodeCoords = {
  x: number;
  y: number;
};

type GraphNodePosition = {
  node: RoadmapNode;
  x: number;
  y: number;
  satellites: { label: string; x: number; y: number }[];
};

export function KnowledgeGraph() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mentorFilter, setMentorFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"canvas" | "synapse">("canvas");

  // User-stretched custom node positions for 2D canvas { [nodeId]: { x, y } }
  const [customPositions, setCustomPositions] = useState<Record<string, NodeCoords>>({});

  // Canvas Pan & Zoom state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0, nodeStartX: 0, nodeStartY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load roadmap
  useEffect(() => {
    fetch("/api/roadmap")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.nodes) {
          setRoadmap(data);
          const active = data.nodes.find((n: RoadmapNode) => n.status === "current") ?? data.nodes[0];
          if (active) setSelectedNodeId(active.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const nodes = roadmap?.nodes ?? [];

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const q = searchQuery.toLowerCase().trim();
      const topic = (n.topic || n.title).toLowerCase();
      const concepts = (n.concepts || n.relatedConcepts || []).map((c) => c.toLowerCase());
      const matchesSearch = !q || topic.includes(q) || concepts.some((c) => c.includes(q)) || n.description.toLowerCase().includes(q);
      const matchesMentor = mentorFilter === "all" || n.mentorId.toLowerCase() === mentorFilter.toLowerCase();
      return matchesSearch && matchesMentor;
    });
  }, [nodes, searchQuery, mentorFilter]);

  // Selected node object
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) ?? nodes[0] ?? null;
  }, [nodes, selectedNodeId]);

  // Index of last unlocked node
  const lastUnlockedIndex = useMemo(() => {
    let lastIdx = 0;
    nodes.forEach((n, idx) => {
      if (n.status === "completed" || n.status === "current" || n.status === "next") {
        lastIdx = idx;
      }
    });
    return lastIdx;
  }, [nodes]);

  const completedCount = useMemo(() => nodes.filter((n) => n.status === "completed").length, [nodes]);
  const unlockedPercent = nodes.length > 0 ? Math.round(((lastUnlockedIndex + 1) / nodes.length) * 100) : 0;

  // Calculate Node Layout Coordinates for 2D Canvas
  const nodePositions = useMemo<GraphNodePosition[]>(() => {
    if (nodes.length === 0) return [];
    const startY = 100;
    const verticalGap = 170;

    return nodes.map((node, index) => {
      const laneOffset = index % 3 === 0 ? 0 : index % 3 === 1 ? -150 : 150;
      const defaultX = 400 + laneOffset;
      const defaultY = startY + index * verticalGap;

      const custom = customPositions[node.id];
      const x = custom ? custom.x : defaultX;
      const y = custom ? custom.y : defaultY;

      const rawConcepts = node.concepts && node.concepts.length > 0 ? node.concepts : node.relatedConcepts ?? [];
      const topConcepts = rawConcepts.slice(0, 3);
      const satellites = topConcepts.map((concept, sIdx) => {
        const angle = ((sIdx - 1) * Math.PI) / 3.2 - Math.PI / 2;
        const radius = 95;
        return {
          label: concept,
          x: x + Math.cos(angle) * radius,
          y: y + Math.sin(angle) * radius * 0.75,
        };
      });

      return { node, x, y, satellites };
    });
  }, [nodes, customPositions]);

  // Center Graph on Initial Load
  const centerGraph = useCallback(() => {
    if (!canvasRef.current || nodePositions.length === 0) return;
    const container = canvasRef.current.getBoundingClientRect();
    if (container.width === 0) return;

    const avgX = nodePositions.reduce((acc, curr) => acc + curr.x, 0) / nodePositions.length;
    const initialPanX = container.width / 2 - avgX;
    const initialPanY = 40;

    setPan({ x: initialPanX, y: initialPanY });
    setScale(0.95);
  }, [nodePositions]);

  useEffect(() => {
    if (!loading && roadmap && nodePositions.length > 0 && viewMode === "canvas") {
      centerGraph();
    }
  }, [loading, roadmap?.id, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canvas Edges
  const canvasEdges = useMemo(() => {
    if (nodePositions.length < 2) return [];
    const edgeList: { from: GraphNodePosition; to: GraphNodePosition; isPrerequisite: boolean; isActive: boolean }[] = [];

    for (let i = 0; i < nodePositions.length - 1; i++) {
      const from = nodePositions[i];
      const to = nodePositions[i + 1];
      const isPrerequisite = to.node.prerequisites?.length > 0;
      const isActive = from.node.status === "completed" && to.node.status === "current";

      edgeList.push({ from, to, isPrerequisite, isActive });
    }
    return edgeList;
  }, [nodePositions]);

  // Non-passive wheel event on 2D canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || viewMode !== "canvas") return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
      setScale((prev) => Math.min(Math.max(prev + zoomDelta, 0.5), 1.8));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [viewMode]);

  // Canvas Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node-drag]")) return;
    setIsPanning(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
      nodeStartX: 0,
      nodeStartY: 0,
    };
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);

    const currentPos = nodePositions.find((p) => p.node.id === nodeId);
    if (currentPos) {
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
        nodeStartX: currentPos.x,
        nodeStartY: currentPos.y,
      };
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingNodeId) {
        const dx = (e.clientX - dragStart.current.x) / scale;
        const dy = (e.clientY - dragStart.current.y) / scale;

        setCustomPositions((prev) => ({
          ...prev,
          [draggingNodeId]: {
            x: dragStart.current.nodeStartX + dx,
            y: dragStart.current.nodeStartY + dy,
          },
        }));
        return;
      }

      if (isPanning) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPan({
          x: dragStart.current.panX + dx,
          y: dragStart.current.panY + dy,
        });
      }
    },
    [draggingNodeId, isPanning, scale]
  );

  // Mobile Touch Handlers (Pan, Pinch-to-Zoom, and Node Drag)
  const touchDistanceRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if ((e.target as HTMLElement).closest("[data-node-drag]")) return;
      const touch = e.touches[0];
      setIsPanning(true);
      dragStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        panX: pan.x,
        panY: pan.y,
        nodeStartX: 0,
        nodeStartY: 0,
      };
      touchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchDistanceRef.current = dist;
      setIsPanning(false);
    }
  };

  const handleNodeTouchStart = (e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);

    const currentPos = nodePositions.find((p) => p.node.id === nodeId);
    if (currentPos) {
      dragStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        panX: pan.x,
        panY: pan.y,
        nodeStartX: currentPos.x,
        nodeStartY: currentPos.y,
      };
    }
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (draggingNodeId) {
          const dx = (touch.clientX - dragStart.current.x) / scale;
          const dy = (touch.clientY - dragStart.current.y) / scale;

          setCustomPositions((prev) => ({
            ...prev,
            [draggingNodeId]: {
              x: dragStart.current.nodeStartX + dx,
              y: dragStart.current.nodeStartY + dy,
            },
          }));
          return;
        }

        if (isPanning) {
          const dx = touch.clientX - dragStart.current.x;
          const dy = touch.clientY - dragStart.current.y;
          setPan({
            x: dragStart.current.panX + dx,
            y: dragStart.current.panY + dy,
          });
        }
      } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const diff = dist - touchDistanceRef.current;
        if (Math.abs(diff) > 4) {
          const zoomDelta = diff > 0 ? 0.02 : -0.02;
          setScale((prev) => Math.min(Math.max(prev + zoomDelta, 0.5), 1.8));
          touchDistanceRef.current = dist;
        }
      }
    },
    [draggingNodeId, isPanning, scale]
  );

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
    touchDistanceRef.current = null;
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
  }, []);

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 1.8));
  };

  const handleResetPositions = () => {
    setCustomPositions({});
    centerGraph();
  };

  const handleFocusActive = () => {
    if (!roadmap || !canvasRef.current) return;
    const activeIdx = roadmap.nodes.findIndex((n) => n.status === "current" || n.status === "next");
    const targetIdx = activeIdx >= 0 ? activeIdx : 0;
    const pos = nodePositions[targetIdx];
    if (pos && canvasRef.current) {
      const container = canvasRef.current.getBoundingClientRect();
      setScale(1.1);
      setPan({
        x: container.width / 2 - pos.x,
        y: container.height / 2 - pos.y,
      });
      setSelectedNodeId(pos.node.id);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const offset = direction === "left" ? -320 : 320;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-[480px] bg-muted/60 animate-pulse rounded-3xl" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <Card className="rounded-3xl border-dashed bg-muted/20 p-8 text-center space-y-3">
        <Network className="h-10 w-10 text-muted-foreground mx-auto" />
        <CardTitle className="text-base sm:text-lg">No Learning Roadmap Found</CardTitle>
        <CardDescription className="text-xs sm:text-sm max-w-md mx-auto">
          Save your learning profile to generate your structured Concept-First knowledge system.
        </CardDescription>
        <Button onClick={() => (window.location.href = "/dashboard")} className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold h-9 px-4">
          Go to Dashboard
        </Button>
      </Card>
    );
  }

  const mentorsList = Array.from(new Set(nodes.map((n) => n.mentorId))).filter(Boolean);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header Banner & View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b pb-5">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-foreground">
              <Network className="h-6 w-6 text-primary shrink-0" /> Interactive Knowledge Graph
            </h1>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20 font-semibold rounded-md">
              {completedCount} of {nodes.length} Milestones Mastered
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Explore curriculum dependencies via the 2D Draggable Canvas or navigate through the illuminated Synapse Progressive Rail.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="bg-card border border-border/80 rounded-xl p-1 flex items-center gap-1 shadow-2xs">
            <button
              onClick={() => setViewMode("canvas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "canvas" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network className="h-3.5 w-3.5" /> 2D Canvas
            </button>
            <button
              onClick={() => setViewMode("synapse")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "synapse" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="h-3.5 w-3.5" /> Synapse Matrix
            </button>
          </div>

          <Link href="/roadmap">
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-2xs border-border/80">
              <Layers className="h-3.5 w-3.5" /> Roadmap
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search concepts or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 flex-wrap">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
            Track:
          </span>
          <button
            onClick={() => setMentorFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mentorFilter === "all" ? "bg-primary text-primary-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All Milestones
          </button>
          {mentorsList.map((m) => (
            <button
              key={m}
              onClick={() => setMentorFilter(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                mentorFilter === m ? "bg-primary text-primary-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: 2D Canvas View (Stretchable & Draggable Canvas) */}
      {viewMode === "canvas" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 sm:gap-6 items-start">
          {/* 2D Interactive SVG Network Canvas */}
          <div className="relative rounded-3xl border border-border/80 bg-muted/20 dark:bg-card/40 overflow-hidden shadow-2xs h-[600px] flex flex-col justify-between select-none">
            {/* Canvas Floating Navigation Toolbar */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-background/95 backdrop-blur-md border border-border/80 p-1.5 rounded-2xl shadow-md flex-wrap max-w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZoom(0.15)}
                className="h-7 w-7 p-0 rounded-lg cursor-pointer hover:bg-muted"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZoom(-0.15)}
                className="h-7 w-7 p-0 rounded-lg cursor-pointer hover:bg-muted"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="h-4 w-px bg-border mx-0.5" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetPositions}
                className="h-7 px-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-muted"
                title="Reset layout and pan"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset ({Math.round(scale * 100)}%)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFocusActive}
                className="h-7 px-2 text-xs font-semibold text-primary rounded-lg cursor-pointer hover:bg-primary/10"
                title="Center on active node"
              >
                <Crosshair className="h-3.5 w-3.5 mr-1" /> Focus Active
              </Button>
            </div>

            {/* Canvas Area */}
            <div
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={`w-full h-full cursor-${isPanning ? "grabbing" : "grab"} overflow-hidden relative touch-none select-none`}
            >
              {/* Dot Grid Pattern */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                <defs>
                  <pattern id="grid-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-pattern)" />
              </svg>

              {/* Pannable & Scalable Viewport Layer */}
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  transformOrigin: "0 0",
                  transition: isPanning || draggingNodeId ? "none" : "transform 0.12s ease-out",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "2000px",
                  height: "2500px",
                }}
              >
                {/* SVG Connections */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                  style={{ zIndex: 1 }}
                >
                  <defs>
                    <marker
                      id="arrow-head"
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" className="text-primary" />
                    </marker>
                  </defs>

                  {canvasEdges.map((edge, idx) => {
                    const isEdgeConnectedToSelected =
                      selectedNodeId === edge.from.node.id || selectedNodeId === edge.to.node.id;

                    const deltaY = edge.to.y - edge.from.y;
                    const cY1 = edge.from.y + deltaY * 0.45;
                    const cY2 = edge.to.y - deltaY * 0.45;

                    const pathData = `M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${cY1}, ${edge.to.x} ${cY2}, ${edge.to.x} ${edge.to.y}`;

                    return (
                      <g key={idx}>
                        <path
                          d={pathData}
                          fill="none"
                          stroke={isEdgeConnectedToSelected ? "currentColor" : "currentColor"}
                          strokeWidth={isEdgeConnectedToSelected ? 3 : 2}
                          strokeDasharray={edge.isActive ? "6,4" : "none"}
                          className={`transition-colors ${
                            isEdgeConnectedToSelected
                              ? "opacity-100 drop-shadow-sm text-primary"
                              : edge.from.node.status === "completed"
                              ? "text-emerald-500/50 opacity-70"
                              : "text-muted-foreground/30 opacity-40"
                          }`}
                          markerEnd="url(#arrow-head)"
                        />

                        {edge.from.satellites.map((sat, sIdx) => (
                          <line
                            key={sIdx}
                            x1={edge.from.x}
                            y1={edge.from.y}
                            x2={sat.x}
                            y2={sat.y}
                            stroke="currentColor"
                            strokeWidth={1}
                            strokeDasharray="2,3"
                            className="opacity-30 text-primary"
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes */}
                {nodePositions.map((pos) => {
                  const node = pos.node;
                  const isSelected = selectedNodeId === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isBeingDragged = draggingNodeId === node.id;
                  const isVisible = filteredNodes.some((fn) => fn.id === node.id);

                  const statusColor =
                    node.status === "completed"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : node.status === "current"
                      ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/20"
                      : node.status === "next"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-border/80 bg-card text-muted-foreground opacity-60";

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: "absolute",
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        transform: "translate(-50%, -50%)",
                        zIndex: isBeingDragged ? 30 : isSelected ? 20 : isHovered ? 15 : 5,
                        opacity: isVisible ? 1 : 0.25,
                      }}
                      className="transition-opacity duration-150"
                    >
                      {/* Satellite Concept Chips */}
                      {pos.satellites.map((sat, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            position: "absolute",
                            left: `${sat.x - pos.x}px`,
                            top: `${sat.y - pos.y}px`,
                            transform: "translate(-50%, -50%)",
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border bg-background/90 backdrop-blur-xs shadow-2xs whitespace-nowrap transition-all pointer-events-none ${
                            isSelected
                              ? "border-primary/50 text-primary scale-105"
                              : "border-border/60 text-muted-foreground opacity-70"
                          }`}
                        >
                          {sat.label}
                        </div>
                      ))}

                      {/* Main Node Card */}
                      <div
                        data-node-drag="true"
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                        onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className={`rounded-2xl border-2 px-3.5 py-3 text-left transition-shadow cursor-move shadow-sm w-60 bg-card/95 backdrop-blur-md flex flex-col justify-between gap-1.5 ${statusColor} ${
                          isSelected ? "shadow-lg ring-2 ring-primary" : "hover:shadow-md"
                        } ${isBeingDragged ? "scale-105 shadow-xl opacity-95 cursor-grabbing" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-sm bg-background/80 border border-border/70 flex items-center gap-1">
                            <Move className="h-2.5 w-2.5 text-muted-foreground" /> Week {node.week ?? 1}
                          </span>
                          <div className="flex items-center gap-1">
                            {node.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                            {node.status === "current" && (
                              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
                            )}
                            {node.status === "locked" && <Lock className="h-3 w-3 text-muted-foreground" />}
                            <Badge variant="outline" className="text-[9px] capitalize py-0 px-1.5">
                              {node.mentorId}
                            </Badge>
                          </div>
                        </div>

                        <p className="font-bold text-xs sm:text-sm tracking-tight text-foreground line-clamp-1">
                          {node.topic || node.title}
                        </p>

                        <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                          {node.featureCompleted || node.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="p-3 bg-card/90 backdrop-blur-md border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2 z-10">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Mastered
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-primary" /> In Progress
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Up Next
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-zinc-500" /> Upcoming
                </span>
              </div>
              <span className="text-[11px]">Hold & drag to scroll/pan • Pinch to zoom • Drag nodes to re-arrange</span>
            </div>
          </div>

          {/* Right Column: Concept Inspector */}
          <ConceptInspector selectedNode={selectedNode} />
        </div>
      )}

      {/* VIEW 2: Horizontal Synapse Progressive Rail */}
      {viewMode === "synapse" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xs space-y-4 relative overflow-hidden">
            {/* Rail Top Bar with Scroll Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-primary" /> Synapse Progressive Track
                </span>
                <span className="text-[11px] text-muted-foreground">({unlockedPercent}% Pathway Unlocked)</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleScroll("left")}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer hover:bg-muted"
                  title="Scroll Left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleScroll("right")}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer hover:bg-muted"
                  title="Scroll Right"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Scrollable Horizontal Track */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto pb-4 pt-6 px-2 flex items-stretch gap-6 sm:gap-8 scroll-smooth select-none relative"
            >
              {filteredNodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                const isCompleted = node.status === "completed";
                const isCurrent = node.status === "current";
                const isLocked = node.status === "locked";
                const isUnlocked = !isLocked;

                const nodeConcepts = (node.concepts && node.concepts.length > 0 ? node.concepts : node.relatedConcepts ?? []).slice(0, 3);
                const isConnectedToNext = index < filteredNodes.length - 1;
                const isNextNodeUnlocked = index < lastUnlockedIndex;

                return (
                  <div key={node.id} className="flex items-center shrink-0 relative">
                    {/* Horizontal Synapse Connection Line */}
                    {isConnectedToNext && (
                      <div
                        className={`absolute top-1/2 -right-6 sm:-right-8 w-6 sm:w-8 h-0.5 -translate-y-1/2 z-0 transition-all ${
                          isNextNodeUnlocked
                            ? "bg-primary shadow-2xs"
                            : "bg-muted-foreground/20 border-t border-dashed border-muted-foreground/40"
                        }`}
                      >
                        {isCompleted && index === lastUnlockedIndex - 1 && (
                          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                        )}
                      </div>
                    )}

                    {/* Milestone Node Card */}
                    <div
                      onClick={() => {
                        if (isUnlocked) setSelectedNodeId(node.id);
                      }}
                      className={`w-64 sm:w-72 rounded-2xl border p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 transition-all relative z-10 ${
                        isLocked
                          ? "bg-muted/30 border-dashed border-border/80 opacity-60 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary/10 border-primary ring-2 ring-primary/30 shadow-md cursor-pointer scale-102"
                          : isCompleted
                          ? "bg-card border-emerald-500/30 hover:border-emerald-500 hover:shadow-sm cursor-pointer"
                          : isCurrent
                          ? "bg-card border-primary/50 hover:border-primary hover:shadow-sm ring-1 ring-primary/20 cursor-pointer"
                          : "bg-card border-border/80 hover:border-primary/40 hover:shadow-sm cursor-pointer"
                      }`}
                    >
                      {/* Top Status & Week Tag */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-background border text-primary">
                          Week {node.week ?? index + 1}
                        </span>

                        <div className="flex items-center gap-1">
                          {isCompleted && (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.2 rounded-md">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                            </Badge>
                          )}
                          {isCurrent && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.2 rounded-md animate-pulse">
                              Active
                            </Badge>
                          )}
                          {node.status === "next" && (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.2 rounded-md">
                              Unlocked
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] capitalize py-0 px-1.5">
                            {node.mentorId}
                          </Badge>
                        </div>
                      </div>

                      {/* Topic Title */}
                      <div>
                        <h3 className={`font-bold text-xs sm:text-sm tracking-tight leading-snug line-clamp-2 ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {node.topic || node.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                          {node.description}
                        </p>
                      </div>

                      {/* Sub-Concept Tags */}
                      {nodeConcepts.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
                          {nodeConcepts.map((c, cIdx) => (
                            <span
                              key={cIdx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/60"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Centered Lock Overlay for Locked Nodes */}
                      {isLocked && (
                        <div className="absolute inset-0 rounded-2xl bg-background/70 backdrop-blur-2xs flex flex-col items-center justify-center p-3 text-center z-20 space-y-1">
                          <div className="h-8 w-8 rounded-full bg-muted border border-border/80 flex items-center justify-center shadow-xs">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-[11px] font-bold text-foreground">Locked Milestone</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Master Week {index} to unlock</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pathway Legend Footer */}
            <div className="p-3 bg-muted/30 rounded-2xl border border-border/60 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Mastered
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Active
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Locked (Requires Prerequisites)
                </span>
              </div>
              <span className="text-[11px]">Click any unlocked milestone to launch concept resources</span>
            </div>
          </div>

          {/* Docked Concept Inspector for Synapse Mode */}
          <ConceptInspector selectedNode={selectedNode} />
        </div>
      )}
    </div>
  );
}

function ConceptInspector({ selectedNode }: { selectedNode: RoadmapNode | null }) {
  if (!selectedNode) {
    return (
      <Card className="rounded-3xl border border-dashed p-6 text-center text-xs text-muted-foreground">
        Select any unlocked milestone to inspect details.
      </Card>
    );
  }

  const concepts = selectedNode.concepts && selectedNode.concepts.length > 0 ? selectedNode.concepts : selectedNode.relatedConcepts ?? [];

  return (
    <Card className="rounded-3xl border border-border/80 shadow-2xs overflow-hidden bg-card">
      <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              Week {selectedNode.week ?? 1} Knowledge Node
            </span>
            <Badge variant="outline" className="text-[11px] capitalize">
              {selectedNode.difficulty}
            </Badge>
            <Badge variant="secondary" className="text-[11px] capitalize">
              {selectedNode.mentorId} Mentor
            </Badge>
          </div>

          {selectedNode.status === "completed" ? (
            <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">Mastered</Badge>
          ) : selectedNode.status === "current" ? (
            <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold">Active Track</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">Unlocked</Badge>
          )}
        </div>

        <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
          {selectedNode.topic || selectedNode.title}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
          {selectedNode.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Mental Model */}
          {selectedNode.mentalModels && selectedNode.mentalModels.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 space-y-1 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-primary" /> Architectural Mental Model
              </span>
              <p className="text-xs text-foreground/85 leading-relaxed pt-0.5">
                {selectedNode.mentalModels[0]}
              </p>
            </div>
          )}

          {/* Main-Project Application */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 space-y-1 shadow-2xs">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Hammer className="h-3.5 w-3.5 text-primary" /> Applied in Main-Project
            </span>
            <p className="text-xs font-medium text-foreground/90 leading-relaxed pt-0.5">
              {selectedNode.featureCompleted || selectedNode.capstoneApplication?.[0] || selectedNode.projectWork?.[0] || "Construct production deliverables in project codebase."}
            </p>
          </div>
        </div>

        {/* Concepts List */}
        {concepts.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Covered Concepts
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {concepts.map((c, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs font-medium px-2.5 py-0.5 bg-muted/70 text-foreground border border-border/70 rounded-md">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Launchers */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/60">
          <Link
            href={`/resources?topic=${encodeURIComponent(selectedNode.topic || selectedNode.title)}&week=${selectedNode.week ?? 1}&concepts=${encodeURIComponent(concepts.join(","))}`}
          >
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold h-8.5 px-4 gap-1.5 shadow-2xs cursor-pointer">
              <BookOpen className="h-3.5 w-3.5" /> Learn from Resources
            </Button>
          </Link>

          <Link href="/projects">
            <Button variant="outline" className="rounded-xl text-xs font-semibold h-8.5 px-4 gap-1.5 border-border/80">
              <Hammer className="h-3.5 w-3.5" /> Main-Project Tasks
            </Button>
          </Link>

          <Link
            href={`/chat?mentor=${selectedNode.mentorId}&query=${encodeURIComponent(`Can you explain "${selectedNode.topic || selectedNode.title}" and practical implementation tradeoffs?`)}`}
          >
            <Button variant="ghost" className="rounded-xl text-xs font-semibold h-8.5 px-3 gap-1.5 text-primary">
              <MessageSquare className="h-3.5 w-3.5" /> Ask Mentor
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
