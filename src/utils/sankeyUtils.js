/**
 * Calcule la somme des comptes commençant par les préfixes donnés
 * @param {Object} balance - ex: { "707": 1000, "601": 200 }
 * @param {Array} prefixes - ex: ["60", "61"]
 */
const sumAccounts = (balance, prefixes) => {
    if (!prefixes) return 0;
    return Object.keys(balance).reduce((acc, compte) => {
        // Vérifie si le compte commence par un des préfixes (ex: "601" commence par "60")
        if (prefixes.some(p => compte.startsWith(p))) {
            return acc + (balance[compte] || 0);
        }
        return acc;
    }, 0);
};

export const generateSankeyData = (balanceComptable, mappingConfig) => {
    const links = [];
    const nodeValues = {}; // Pour stocker les totaux intermédiaires

    // 1. Calculer d'abord les valeurs des feuilles (Leafs) et Sources
    mappingConfig.forEach(node => {
        if (node.comptes) {
            nodeValues[node.id] = sumAccounts(balanceComptable, node.comptes);
        }
    });

    // 2. Calculer les groupes (somme des enfants)
    // On fait une passe inverse ou on filtre par parents, pour l'exemple on simplifie :
    // "CHARGES_EXP" est la somme de ses enfants définis dans le JSON
    const groupNodes = mappingConfig.filter(n => n.type === 'group');
    groupNodes.forEach(group => {
        const children = mappingConfig.filter(n => n.source === group.id);
        nodeValues[group.id] = children.reduce((sum, child) => sum + (nodeValues[child.id] || 0), 0);
    });

    // 3. Générer les liens et calculer les résultats en cascade
    mappingConfig.forEach(node => {
        // Cas A : C'est une dépense finale (Leaf) rattachée à un parent
        if (node.type === 'leaf' || node.type === 'group') {
            if (node.source) {
                const sourceNode = mappingConfig.find(n => n.id === node.source);
                if (sourceNode) {
                    links.push({
                        source: sourceNode.label,
                        target: node.label,
                        value: nodeValues[node.id]
                    });
                }
            }
        }

        // Cas B : C'est un Résultat (Le "reste" du flux)
        if (node.type === 'resultat' && node.source) {
            const sourceValue = nodeValues[node.source];
            // On soustrait tout ce qui a été défini comme "minus" dans la config
            const deductions = node.minus ? node.minus.reduce((acc, minusId) => acc + (nodeValues[minusId] || 0), 0) : 0;

            const resultValue = sourceValue - deductions;
            nodeValues[node.id] = resultValue; // On stocke pour l'étape suivante (cascade)

            if (resultValue > 0) {
                const sourceNode = mappingConfig.find(n => n.id === node.source);
                if (sourceNode) {
                    links.push({
                        source: sourceNode.label,
                        target: node.label,
                        value: resultValue
                    });
                }
            }
        }
    });

    return links;
};
