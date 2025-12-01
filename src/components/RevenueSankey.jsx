import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyJustify } from 'd3-sankey';

const COLORS = {
    revenue: "#4F81BD",
    cogs: "#C0504D",
    gross: "#9BBB59",
    expense: "#D99694",
    tax: "#E6B8B7",
    net: "#4F6228",
    netNegative: "#C0504D",
    gray: "#A5A5A5"
};

const formatCurrency = (value) => {
    const absValue = Math.abs(value);
    const isNegative = value < 0;
    if (absValue >= 1000000) return (isNegative ? '-' : '') + (absValue / 1000000).toFixed(1).replace('.', ',') + ' M€';
    if (absValue >= 1000) return (isNegative ? '-' : '') + (absValue / 1000).toFixed(0) + ' k€';
    return (isNegative ? '-' : '') + absValue.toFixed(0) + ' €';
};

const sumAccounts = (balance, prefixes) => {
    if (!balance) return 0;
    return Object.keys(balance).reduce((acc, compte) => {
        if (prefixes.some(p => compte.startsWith(p))) return acc + (balance[compte] || 0);
        return acc;
    }, 0);
};

const RevenueSankey = ({ data }) => {
    const svgRef = useRef();
    const containerRef = useRef();
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const processedData = useMemo(() => {
        let balance = {
            "707": 1200000, "706": 300000, "761": 15000, "771": 30000,
            "607": 650000, "601": 120000, "613": 60000, "622": 50000,
            "641": 700000, "645": 300000, "631": 40000, "681": 80000,
            "651": 50000, "661": 30000, "671": 20000, "695": 150000
        };

        if (data?.produits || data?.charges) {
            balance = {};
            const traverse = (items) => items?.forEach(i => {
                if (i.classe) balance[i.classe] = i.solde;
                if (i.subAccounts) traverse(i.subAccounts);
            });
            ['exploitation', 'financier', 'exceptionnel', 'participationImpots'].forEach(c => {
                traverse(data?.produits?.[c]);
                traverse(data?.charges?.[c]);
            });
        }

        const sums = {
            P_EXP: sumAccounts(balance, ["70", "71", "72", "74", "75", "78", "79"]),
            P_FIN: sumAccounts(balance, ["76", "786", "796"]),
            P_EXC: sumAccounts(balance, ["77", "787", "797"]),
            ACHATS: sumAccounts(balance, ["60"]),
            EXT: sumAccounts(balance, ["61", "62"]),
            SALAIRES: sumAccounts(balance, ["64", "691"]),
            TAXES: sumAccounts(balance, ["63", "69"]),
            DOTATIONS: sumAccounts(balance, ["68"]),
            AUTRES: sumAccounts(balance, ["65"]),
            C_FIN: sumAccounts(balance, ["66", "686"]),
            C_EXC: sumAccounts(balance, ["67", "687"])
        };

        const totalRevenue = sums.P_EXP + sums.P_FIN + sums.P_EXC;
        const totalDirectCosts = sums.ACHATS + sums.EXT;
        const totalOverheads = sums.SALAIRES + sums.TAXES + sums.DOTATIONS + sums.AUTRES + sums.C_FIN + sums.C_EXC;
        
        const VA_Accounting = totalRevenue - totalDirectCosts;
        const NET = VA_Accounting - totalOverheads;
        const isNetNegative = NET < 0;

        const nodes = [
            { id: 'TOTAL', name: 'Produits', color: COLORS.revenue },
            { id: 'VA', name: 'Valeur Ajoutée', color: COLORS.gross, value: VA_Accounting, netValue: VA_Accounting },
            { id: 'ACHATS', name: 'Achats', color: COLORS.cogs },
            { id: 'EXT', name: 'Services Ext.', color: COLORS.cogs },
            { id: 'SALAIRES', name: 'Salaires', color: COLORS.expense },
            { id: 'NET', name: 'Résultat Net', color: isNetNegative ? COLORS.netNegative : COLORS.net, netValue: NET }
        ];

        if (sums.P_EXP) nodes.push({ id: 'P_EXP', name: 'Exploitation', color: COLORS.revenue });
        if (sums.P_FIN) nodes.push({ id: 'P_FIN', name: 'Financier', color: COLORS.revenue });
        if (sums.P_EXC) nodes.push({ id: 'P_EXC', name: 'Exceptionnel', color: COLORS.revenue });
        if (sums.TAXES) nodes.push({ id: 'TAXES', name: 'Impôts & Taxes', color: COLORS.tax });
        if (sums.DOTATIONS) nodes.push({ id: 'DOTATIONS', name: 'Dotations', color: COLORS.expense });
        if (sums.AUTRES) nodes.push({ id: 'AUTRES', name: 'Autres', color: COLORS.expense });
        if (sums.C_FIN) nodes.push({ id: 'C_FIN', name: 'Ch. Fin.', color: COLORS.expense });
        if (sums.C_EXC) nodes.push({ id: 'C_EXC', name: 'Ch. Excep.', color: COLORS.expense });

        const links = [];
        const addLink = (s, t, v, l) => v > 0 && links.push({ source: s, target: t, value: v, label: l });

        addLink('P_EXP', 'TOTAL', sums.P_EXP);
        addLink('P_FIN', 'TOTAL', sums.P_FIN);
        addLink('P_EXC', 'TOTAL', sums.P_EXC);
        addLink('TOTAL', 'ACHATS', sums.ACHATS);
        addLink('TOTAL', 'EXT', sums.EXT);
        
        if (VA_Accounting > 0) {
            links.push({ source: 'TOTAL', target: 'VA', value: VA_Accounting });
        }

        addLink('VA', 'SALAIRES', sums.SALAIRES);
        addLink('VA', 'TAXES', sums.TAXES);
        addLink('VA', 'DOTATIONS', sums.DOTATIONS);
        addLink('VA', 'AUTRES', sums.AUTRES);
        addLink('VA', 'C_FIN', sums.C_FIN);
        addLink('VA', 'C_EXC', sums.C_EXC);

        if (!isNetNegative) {
            addLink('VA', 'NET', NET);
        } else {
            links.push({ source: 'NET', target: 'VA', value: Math.abs(NET), isLoss: true });
        }

        return { nodes, links, isNetNegative };
    }, [data]);

    useEffect(() => {
        if (!processedData.nodes.length || !width) return;

        const margin = { top: 40, right: 130, bottom: 40, left: 130 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = 600 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const defs = svg.append('defs');
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const nodeOrder = ['ACHATS', 'EXT', 'SALAIRES', 'TAXES', 'DOTATIONS', 'AUTRES', 'C_FIN', 'C_EXC', 'NET'];
        const nodeSort = (a, b) => {
            const indexA = nodeOrder.indexOf(a.id);
            const indexB = nodeOrder.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (a.id === 'NET') return 1;
            if (b.id === 'NET') return -1;
            return b.value - a.value;
        };

        const sankeyGenerator = sankey()
            .nodeId(d => d.id)
            .nodeWidth(30)
            .nodePadding(30) // MODIFICATION ICI : passage de 20 à 30
            .nodeAlign(sankeyJustify)
            .nodeSort(nodeSort)
            .extent([[0, 0], [innerWidth, innerHeight]]);

        const graph = sankeyGenerator({
            nodes: processedData.nodes.map(d => ({ ...d })),
            links: processedData.links.map(d => ({ ...d }))
        });

        if (processedData.isNetNegative) {
            const netNode = graph.nodes.find(n => n.id === 'NET');
            const totalNode = graph.nodes.find(n => n.id === 'TOTAL');
            const vaNode = graph.nodes.find(n => n.id === 'VA');

            if (netNode && totalNode && vaNode) {
                const midX = (totalNode.x1 + vaNode.x0) / 2;
                const netW = netNode.x1 - netNode.x0;
                netNode.x0 = midX - (netW / 2);
                netNode.x1 = midX + (netW / 2);

                netNode.y0 = vaNode.y1 + 40;
                netNode.y1 = netNode.y0 + Math.max(20, (netNode.value / vaNode.value) * (vaNode.y1 - vaNode.y0));

                const link = graph.links.find(l => l.source.id === 'NET');
                if (link) {
                    link.y0 = (netNode.y0 + netNode.y1) / 2;
                }
            }
        }

        graph.links.forEach((l, i) => {
            const id = `grad-${i}`;
            const gr = defs.append('linearGradient').attr('id', id).attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', l.source.x1).attr('x2', l.target.x0);
            gr.append('stop').attr('offset', '0%').attr('stop-color', l.source.color);
            gr.append('stop').attr('offset', '100%').attr('stop-color', l.target.color);
            l.gradientId = id;
        });

        // Récupération du lien TOTAL->VA pour le positionnement du label
        const totalToVaLink = graph.links.find(l => l.source.id === 'TOTAL' && l.target.id === 'VA');

        const drawLink = (d) => {
            const widthS = d.source.x1 - d.source.x0;
            const widthT = d.target.x1 - d.target.x0;
            
            const x0 = d.source.x1 - (widthS / 2);
            const x1 = d.target.x0 + (widthT / 2);
            
            const linkGen = d3.linkHorizontal()
                .source(() => [x0, d.y0])
                .target(() => [x1, d.y1]);
            
            return linkGen();
        };

        g.append('g').selectAll('path').data(graph.links).join('path')
            .attr('d', drawLink)
            .attr('fill', 'none')
            .attr('stroke', d => `url(#${d.gradientId})`)
            .attr('stroke-width', d => Math.max(1, d.width))
            .attr('stroke-opacity', 0.5)
            .style('mix-blend-mode', 'multiply');

        g.append('g').selectAll('text').data(graph.links.filter(d => d.label)).join('text')
            .attr('font-size', '11px').attr('fill', '#4A5568').attr('font-weight', '500')
            .attr('text-anchor', 'middle')
            .attr('x', d => (d.source.x1 + d.target.x0) / 2)
            .attr('y', d => (d.y0 + d.y1) / 2)
            .attr('dy', '-0.5em')
            .text(d => d.label);

        g.append('g').selectAll('rect').data(graph.nodes).join('rect')
            .attr('x', d => d.x0).attr('y', d => d.y0)
            .attr('height', d => Math.max(1, d.y1 - d.y0))
            .attr('width', d => d.x1 - d.x0)
            .attr('fill', d => d.color)
            .attr('rx', 10);

        const labels = g.append('g').style('font-family', 'IBM Plex Sans, sans-serif').selectAll('text').data(graph.nodes).join('text')
            .attr('x', d => {
                if (d.id === 'VA') return d.x0 - 10;
                if (d.id === 'NET' && processedData.isNetNegative) return d.x0 - 10;
                return d.x0 < innerWidth / 2 ? d.x0 - 10 : d.x1 + 10;
            })
            .attr('y', d => {
                if (d.id === 'VA' && totalToVaLink) {
                    return (totalToVaLink.y0 + totalToVaLink.y1) / 2;
                }
                return (d.y1 + d.y0) / 2;
            })
            .attr('text-anchor', d => {
                if (d.id === 'VA') return 'end';
                if (d.id === 'NET' && processedData.isNetNegative) return 'end';
                return d.x0 < innerWidth / 2 ? 'end' : 'start';
            })
            .attr('dy', '0.35em');

        labels.append('tspan').text(d => d.name).attr('font-weight', 'bold').attr('fill', '#2D3748').attr('font-size', '13px');
        labels.append('tspan').text(d => formatCurrency(d.netValue !== undefined ? d.netValue : (d.vaValue || d.value)))
            .attr('x', d => {
                if (d.id === 'VA' || d.x0 < innerWidth / 2) return d.x0 - 10;
                if (d.id === 'NET' && processedData.isNetNegative) return d.x0 - 10;
                return d.x1 + 10;
            })
            .attr('dy', '1.2em').attr('fill', '#718096').attr('font-size', '12px');

    }, [processedData, width]);

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-8 relative" ref={containerRef}>
                    <svg ref={svgRef} width="100%" height="600" style={{overflow: 'visible'}}></svg>
                </div>
            </div>
        </div>
    );
};

export default RevenueSankey;