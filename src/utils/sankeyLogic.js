/**
 * Calcule la somme des comptes commençant par les préfixes donnés
 */
const sumAccounts = (balance, prefixes) => {
    if (!prefixes) return 0;
    return Object.keys(balance).reduce((acc, compte) => {
        if (prefixes.some(p => compte.startsWith(p))) {
            return acc + (balance[compte] || 0);
        }
        return acc;
    }, 0);
};

export const buildAmazonSankey = (balance, config) => {
    const links = [];
    const nodes = config.nodes;

    // Helper pour récupérer la valeur d'un noeud feuille (somme des comptes)
    const getNodeValue = (nodeKey) => {
        return sumAccounts(balance, nodes[nodeKey].comptes);
    };

    // --- ETAPE 1 : SOURCES VERS TOTAL ---
    const val_P_EXP = getNodeValue('P_EXP');
    const val_P_FIN = getNodeValue('P_FIN');
    const val_P_EXC = getNodeValue('P_EXC');

    if (val_P_EXP > 0) links.push({ source: nodes.P_EXP.label, target: nodes.TOTAL.label, value: val_P_EXP });
    if (val_P_FIN > 0) links.push({ source: nodes.P_FIN.label, target: nodes.TOTAL.label, value: val_P_FIN });
    if (val_P_EXC > 0) links.push({ source: nodes.P_EXC.label, target: nodes.TOTAL.label, value: val_P_EXC });

    const val_TOTAL = val_P_EXP + val_P_FIN + val_P_EXC;

    // --- ETAPE 2 : TOTAL VERS VANNE 1 (ACHATS, EXT) ET VA ---
    const val_ACHATS = getNodeValue('ACHATS');
    const val_EXT = getNodeValue('EXT');

    if (val_ACHATS > 0) links.push({ source: nodes.TOTAL.label, target: nodes.ACHATS.label, value: val_ACHATS });
    if (val_EXT > 0) links.push({ source: nodes.TOTAL.label, target: nodes.EXT.label, value: val_EXT });

    const val_VA = val_TOTAL - val_ACHATS - val_EXT;

    if (val_VA > 0) {
        links.push({ source: nodes.TOTAL.label, target: nodes.VA.label, value: val_VA });
    }

    // --- ETAPE 3 : VA VERS VANNE 2 (SALAIRES, TAXES, ETC) ET RAI ---
    // Si VA <= 0, le flux s'arrête là (ou on pourrait gérer la perte, mais consigne = stop)
    if (val_VA > 0) {
        const val_SALAIRES = getNodeValue('SALAIRES');
        const val_TAXES = getNodeValue('TAXES');
        const val_DOTATIONS = getNodeValue('DOTATIONS');
        const val_AUTRES = getNodeValue('AUTRES');
        const val_C_FIN = getNodeValue('C_FIN');
        const val_C_EXC = getNodeValue('C_EXC');

        if (val_SALAIRES > 0) links.push({ source: nodes.VA.label, target: nodes.SALAIRES.label, value: val_SALAIRES });
        if (val_TAXES > 0) links.push({ source: nodes.VA.label, target: nodes.TAXES.label, value: val_TAXES });
        if (val_DOTATIONS > 0) links.push({ source: nodes.VA.label, target: nodes.DOTATIONS.label, value: val_DOTATIONS });
        if (val_AUTRES > 0) links.push({ source: nodes.VA.label, target: nodes.AUTRES.label, value: val_AUTRES });
        if (val_C_FIN > 0) links.push({ source: nodes.VA.label, target: nodes.C_FIN.label, value: val_C_FIN });
        if (val_C_EXC > 0) links.push({ source: nodes.VA.label, target: nodes.C_EXC.label, value: val_C_EXC });

        const val_RAI = val_VA - (val_SALAIRES + val_TAXES + val_DOTATIONS + val_AUTRES + val_C_FIN + val_C_EXC);

        if (val_RAI > 0) {
            links.push({ source: nodes.VA.label, target: nodes.R_AVT_IS.label, value: val_RAI });
        }

        // --- ETAPE 4 : RAI VERS IS ET NET ---
        if (val_RAI > 0) {
            const val_IS = getNodeValue('IS');
            if (val_IS > 0) links.push({ source: nodes.R_AVT_IS.label, target: nodes.IS.label, value: val_IS });

            const val_NET = val_RAI - val_IS;
            if (val_NET > 0) {
                links.push({ source: nodes.R_AVT_IS.label, target: nodes.NET.label, value: val_NET });
            }
        }
    }

    return links;
};
