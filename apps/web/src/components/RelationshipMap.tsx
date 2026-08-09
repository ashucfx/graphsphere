import type { ExpertGraphResult } from "@graphsphere/shared";

type Props = {
  result: ExpertGraphResult | null;
};

const NODE_THEMES = [
  { fill: "url(#grad-blue)", stroke: "#3b82f6", glow: "#60a5fa", label: "Employee", badgeBg: "rgba(59, 130, 246, 0.15)" },
  { fill: "url(#grad-purple)", stroke: "#8b5cf6", glow: "#c084fc", label: "Project", badgeBg: "rgba(139, 92, 246, 0.15)" },
  { fill: "url(#grad-emerald)", stroke: "#10b981", glow: "#34d399", label: "Collaborator", badgeBg: "rgba(16, 185, 129, 0.15)" },
  { fill: "url(#grad-amber)", stroke: "#f59e0b", glow: "#fbbf24", label: "Skill", badgeBg: "rgba(245, 158, 11, 0.15)" }
];

export function RelationshipMap({ result }: Props) {
  const labels = result?.path && result.path.length > 0
    ? result.path
    : [
        { label: "Alex Rivera", relationship: null },
        { label: "Cloud Core Platform", relationship: "WORKED_ON" },
        { label: "Elena Rostova", relationship: "COLLABORATED_WITH" },
        { label: "Distributed Systems", relationship: "HAS_SKILL" }
      ];

  const totalNodes = labels.length;
  const svgWidth = 840;
  const svgHeight = 220;
  const paddingX = 90;
  const cy = 110;
  const stepX = (svgWidth - paddingX * 2) / Math.max(1, totalNodes - 1);

  return (
    <div className="relationship-map-wrapper">
      <svg
        className="relationship-map"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Knowledge Graph Relationship Path"
      >
        <defs>
          {/* Node Fills */}
          <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Line Gradient */}
          <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="node-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Custom Arrowhead Marker */}
          <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#60a5fa" />
          </marker>
        </defs>

        {/* Dynamic Connecting Edges */}
        {labels.map((item, index) => {
          if (index === 0) return null;
          const x1 = paddingX + (index - 1) * stepX;
          const x2 = paddingX + index * stepX;
          const midX = (x1 + x2) / 2;
          const relText = item.relationship ?? "CONNECTED";

          return (
            <g key={`edge-group-${index}`} className="graph-edge-group">
              {/* Base Glowing Edge Line */}
              <line
                x1={x1}
                y1={cy}
                x2={x2}
                y2={cy}
                className="edge-line-glow"
                stroke="url(#line-grad)"
                strokeWidth="3"
                markerEnd="url(#arrow)"
              />
              {/* Animated Data Particle Line */}
              <line
                x1={x1}
                y1={cy}
                x2={x2}
                y2={cy}
                className="edge-line-animated"
                stroke="#93c5fd"
                strokeWidth="2"
                strokeDasharray="6 8"
              />
              {/* Edge Relationship Badge */}
              <g transform={`translate(${midX}, ${cy - 22})`}>
                <rect
                  x={-Math.max(relText.length * 4.2 + 10, 48)}
                  y="-11"
                  width={Math.max(relText.length * 8.4 + 20, 96)}
                  height="22"
                  rx="11"
                  className="edge-badge-bg"
                />
                <text x="0" y="3" className="edge-badge-text">
                  {relText}
                </text>
              </g>
            </g>
          );
        })}

        {/* Dynamic Nodes */}
        {labels.map((item, index) => {
          const cx = paddingX + index * stepX;
          const theme = NODE_THEMES[index % NODE_THEMES.length] ?? NODE_THEMES[0]!;
          const displayLabel = item.label.length > 18 ? `${item.label.slice(0, 16)}...` : item.label;
          const nodeRole = index === 0 ? "Source" : index === 1 ? "Project" : index === 2 ? "Peer" : "Skill";

          return (
            <g key={`node-group-${index}`} className="graph-node-group" transform={`translate(${cx}, ${cy})`}>
              {/* Pulsing Aura Circle */}
              <circle r="36" fill="none" stroke={theme.glow} strokeWidth="1.5" className="node-pulse-ring" opacity="0.4" />
              {/* Main Node Circle */}
              <circle
                r="30"
                fill={theme.fill}
                stroke={theme.stroke}
                strokeWidth="3"
                className="node-main-circle"
                filter="url(#node-glow)"
              />
              {/* Node Index Icon / Counter */}
              <text y="4" className="node-index-text">
                {index + 1}
              </text>

              {/* Node Label Below */}
              <g transform="translate(0, 48)">
                <rect
                  x={-Math.max(displayLabel.length * 3.8 + 12, 40)}
                  y="-12"
                  width={Math.max(displayLabel.length * 7.6 + 24, 80)}
                  height="24"
                  rx="6"
                  className="node-label-bg"
                />
                <text x="0" y="2" className="node-label-text">
                  {displayLabel}
                </text>
                <text x="0" y="20" className="node-sub-role" fill={theme.glow}>
                  {nodeRole.toUpperCase()}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

