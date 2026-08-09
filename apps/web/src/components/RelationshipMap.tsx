import type { ExpertGraphResult } from "@graphsphere/shared";

type Props = {
  result: ExpertGraphResult | null;
};

export function RelationshipMap({ result }: Props) {
  const labels = result
    ? result.path
    : [
        { label: "Employee", relationship: null },
        { label: "Project", relationship: "WORKED_ON" },
        { label: "Collaborator", relationship: "WORKED_WITH" },
        { label: "Skill", relationship: "HAS_SKILL" }
      ];

  return (
    <svg className="relationship-map" role="img" aria-label="Relationship path">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#53606f" />
        </marker>
      </defs>
      {[0, 1, 2].map((index) => (
        <g key={`edge-${index}`}>
          <line x1={100 + index * 185} y1="94" x2={230 + index * 185} y2="94" stroke="#53606f" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x={119 + index * 185} y="78" className="edge-label">
            {labels[index + 1]?.relationship}
          </text>
        </g>
      ))}
      {labels.map((item, index) => (
        <g key={`${item.label}-${index}`}>
          <circle cx={70 + index * 185} cy="94" r="38" className={`node node-${index}`} />
          <text x={70 + index * 185} y="90" className="node-label">
            {item.label.length > 17 ? `${item.label.slice(0, 15)}...` : item.label}
          </text>
          <text x={70 + index * 185} y="108" className="node-type">
            {index === 0 ? "source" : index === 1 ? "project" : index === 2 ? "peer" : "skill"}
          </text>
        </g>
      ))}
    </svg>
  );
}
