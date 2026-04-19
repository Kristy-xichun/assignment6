import { useEffect, useRef, useId } from "react";
import * as d3 from "d3";

/**
 * Lab 10 / Titanic-style treemap: innerWidth/innerHeight, d3.treemap, schemeDark2,
 * rects + labels (attribute field, category, count). Responsive <svg> per assignment.
 */

function cellKey(d) {
    return d
        .ancestors()
        .filter((n) => n.depth > 0)
        .map((n) => n.data.name)
        .join(" / ");
}

/** SVG <text> with tspans — attribute label + numeric value (Q1.1). */
function appendCellText(textRoot, lines, w) {
    const text = textRoot
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", w < 80 ? "10px" : "12px")
        .style("fill", "#fff")
        .style("paint-order", "stroke")
        .style("stroke", "rgba(0,0,0,0.35)")
        .style("stroke-width", "3px");

    if (lines.length === 1) {
        text.text(lines[0]);
        return;
    }

    text.append("tspan")
        .attr("x", 0)
        .attr("dy", lines.length > 2 ? "-0.9em" : "-0.55em")
        .text(lines[0]);

    for (let i = 1; i < lines.length; i += 1) {
        const isLast = i === lines.length - 1;
        text.append("tspan")
            .attr("x", 0)
            .attr("dy", "1.05em")
            .style("font-size", isLast ? "10px" : "11px")
            .style("fill", isLast ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.95)")
            .text(lines[i]);
    }
}

/** First line: "attr: category" (Titanic-style encoding); then optional middle line; last = count. */
function labelLinesForLeaf(d, fmt) {
    const { name, attr } = d.data;
    const line1 =
        attr != null && String(attr).length > 0
            ? `${attr}: ${name}`
            : String(name);
    const countStr = fmt(d.value);
    return [line1, countStr];
}

export function TreeMap(props) {
    const { margin, svg_width, svg_height, tree, selectedCell, setSelectedCell } =
        props;

    const gRef = useRef(null);
    const clipIdPrefix = useId().replace(/:/g, "");

    const innerWidth = svg_width - margin.left - margin.right;
    const innerHeight = svg_height - margin.top - margin.bottom;

    useEffect(() => {
        const g = d3.select(gRef.current);
        g.selectAll("*").remove();

        if (!tree?.children?.length) {
            g.append("text")
                .attr("x", innerWidth / 2)
                .attr("y", innerHeight / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .style("font-size", "14px")
                .style("fill", "#666")
                .text("Select at least one attribute to show the treemap.");
            return;
        }

        const root = d3
            .hierarchy(tree)
            .sum((d) =>
                !d.children || d.children.length === 0 ? d.value || 0 : 0
            )
            .sort((a, b) => b.value - a.value);

        d3.treemap()
            .tile(d3.treemapSquarify)
            .size([innerWidth, innerHeight])
            .paddingOuter(4)
            .paddingInner(2)
            .round(true)(root);

        const color = d3.scaleOrdinal(d3.schemeDark2);

        const leaves = root.leaves();
        const fmt = d3.format(",");

        const leaf = g
            .selectAll("g.leaf")
            .data(leaves)
            .join("g")
            .attr("class", "leaf")
            .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

        leaf.each(function (d, i) {
            const cell = d3.select(this);
            const w = d.x1 - d.x0;
            const h = d.y1 - d.y0;
            const clipId = `${clipIdPrefix}-c${i}`;

            cell.append("defs")
                .append("clipPath")
                .attr("id", clipId)
                .append("rect")
                .attr("width", Math.max(0, w))
                .attr("height", Math.max(0, h));

            cell.append("rect")
                .attr("width", Math.max(0, w))
                .attr("height", Math.max(0, h))
                .attr("fill", () =>
                    color(d.parent ? d.parent.data.name : d.data.name)
                )
                .attr("stroke", () =>
                    selectedCell === cellKey(d) ? "#f6e05e" : "#fff"
                )
                .attr("stroke-width", () =>
                    selectedCell === cellKey(d) ? 3 : 1
                )
                .style("cursor", "pointer")
                .on("click", (event) => {
                    event.stopPropagation();
                    const k = cellKey(d);
                    setSelectedCell((cur) => (cur === k ? null : k));
                });

            if (w < 28 || h < 14) return;

            const [attrLine, countStr] = labelLinesForLeaf(d, fmt);
            const tg = cell
                .append("g")
                .attr("pointer-events", "none")
                .attr("clip-path", `url(#${clipId})`)
                .attr("transform", `translate(${w / 2},${h / 2})`);

            if (h >= 32) {
                appendCellText(tg, [attrLine, `n = ${countStr}`], w);
            } else {
                appendCellText(tg, [attrLine], w);
            }
        });
    }, [
        tree,
        innerWidth,
        innerHeight,
        selectedCell,
        setSelectedCell,
        clipIdPrefix,
    ]);

    return (
        <svg
            viewBox={`0 0 ${svg_width} ${svg_height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%" }}
        >
            <g
                ref={gRef}
                transform={`translate(${margin.left},${margin.top})`}
            />
        </svg>
    );
}
