import React, { useState, useContext, useMemo, useCallback } from 'react';
import { getAccountLabel } from '../utils/accountLabels';
import { formatCurrency } from '../utils/formatters';
import { getAccountType, getResultatPosition } from '../core/AccountClassifier';
import FECContext from '../context/FECContext';
import { Sankey, Tooltip as RechartsTooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import './CompteResultatDisplay.css';

// --- COMPOSANT SANKEY ---
const RevenueSankey = ({ data }) => {
  console.log("RevenueSankey Data:", data);
  const sankeyData = useMemo(() => {
    // Normalisation des données pour supporter les différents formats
    let produits = [];
    let totalProduits = 0;
    let charges = [];
    let totalCharges = 0;

    // Cas 1: Format Hiérarchique ou Formaté
    if (data.produitsExploitation) {
      produits = data.produitsExploitation.lignes || [];
      totalProduits = data.produitsExploitation.total?.montant || 0;
    }
    // Cas 2: Format Classique (Tableaux simples)
    else if (data.produits) {
      produits = data.produits.map(p => ({
        libelle: p.libelle || getAccountLabel(p.classe) || `Compte ${p.classe}`,
        montant: p.solde
      }));
      totalProduits = data.totalProduits || 0;
    }

    if (data.chargesExploitation) {
      charges = data.chargesExploitation.lignes || [];
      totalCharges = data.chargesExploitation.total?.montant || 0;
    }
    else if (data.charges) {
      charges = data.charges.map(c => ({
        libelle: c.libelle || getAccountLabel(c.classe) || `Compte ${c.classe}`,
        montant: c.solde
      }));
      totalCharges = data.totalCharges || 0;
    }

    // Sécurité si pas de données
    console.log("Sankey Totals:", { totalProduits, totalCharges, produitsCount: produits.length, chargesCount: charges.length });
    if (totalProduits === 0 && totalCharges === 0) return null;

    const nodes = [];
    const links = [];

    // 3. Calculer le résultat
    const resultat = totalProduits - totalCharges;
    const isBenefice = resultat >= 0;

    // --- CONSTRUCTION DES NOEUDS ---

    // Index 0 : Le noeud central "Chiffre d'Affaires" (ou Total Produits)
    nodes.push({ name: "Total Produits", color: "#3b82f6" }); // Blue
    const centerIndex = 0;

    let currentIndex = 1;

    // Sources (Produits) -> vers Centre
    produits.forEach(p => {
      // On ignore les petits montants (< 1% du total) pour la lisibilité, sauf si peu de lignes
      if (p.montant > totalProduits * 0.01 || produits.length < 5) {
        nodes.push({ name: p.libelle, color: "#10b981" }); // Emerald
        links.push({ source: currentIndex, target: centerIndex, value: p.montant });
        currentIndex++;
      }
    });

    // Cibles (Charges) <- depuis Centre
    charges.forEach(c => {
      if (c.montant > totalCharges * 0.01 || charges.length < 5) {
        nodes.push({ name: c.libelle, color: "#ef4444" }); // Red
        links.push({ source: centerIndex, target: currentIndex, value: c.montant });
        currentIndex++;
      }
    });

    // Si Bénéfice : On ajoute un noeud "Résultat" en sortie
    if (isBenefice) {
      nodes.push({ name: "Résultat d'Exploitation", color: "#22c55e" }); // Green
      links.push({ source: centerIndex, target: currentIndex, value: resultat });
      currentIndex++;
    } else {
      // Si Perte : On ajoute un noeud "Déficit" en entrée (Source)
      nodes.push({ name: "Déficit d'Exploitation", color: "#f59e0b" }); // Amber
      links.push({ source: currentIndex, target: centerIndex, value: Math.abs(resultat) });
      currentIndex++;
    }

    return { nodes, links };
  }, [data]);

  if (!sankeyData || sankeyData.nodes.length === 0) return null;

  // Custom Node Rendering
  const renderCustomNode = ({ x, y, width, height, index, payload }) => {
    const isOut = sankeyData.links.some(l => l.source.index === index);
    const isIn = sankeyData.links.some(l => l.target.index === index);

    return (
      <Layer key={`node-${index}`}>
        <Rectangle
          x={x} y={y} width={width} height={height}
          fill={payload.color || "#8884d8"}
          fillOpacity={0.9}
        />
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          alignmentBaseline="middle"
          fill="#fff"
          fontSize={12}
          fontWeight="bold"
          style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          transform={height < 20 ? `rotate(-90 ${x + width / 2} ${y + height / 2})` : undefined}
        >
          {payload.name}
        </text>
      </Layer>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-blue-600 rounded"></span>
        Flux du Résultat d'Exploitation
      </h3>
      <div style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            node={renderCustomNode}
            nodePadding={50}
            margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
            link={{ stroke: '#777', strokeOpacity: 0.3 }}
          >
            <RechartsTooltip />
          </Sankey>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-xs text-gray-500 mt-2">
        Visualisation des flux : Produits (Gauche) → Total → Charges & Résultat (Droite)
      </div>
    </div>
  );
};

// Composant pour afficher une section du compte de résultat
const ResultatSection = React.memo(({ title, data, selectedParent, onSelectParent, className }) => {
  if (!data) return null;

  return (
    <div className="compte-resultat-section">
      <div className={`section-title ${className}`}>
        {data.label || title}
      </div>
      <div className="compte-resultat-table">
        {data.comptes && data.comptes.map((compte, idx) => (
          <div
            key={idx}
            className={`compte-resultat-row ${compte.isChild ? 'compte-enfant' : 'compte-parent'} ${!compte.isChild ? 'clickable-parent' : ''} ${selectedParent === compte.numero ? 'selected-parent' : ''}`}
            style={{
              paddingLeft: compte.isChild ? '30px' : '0',
              color: compte.isChild ? '#666' : '#000',
              fontSize: compte.isChild ? '0.9em' : '1em',
              cursor: compte.isChild ? 'default' : 'pointer'
            }}
            onClick={() => !compte.isChild && onSelectParent(selectedParent === compte.numero ? null : compte.numero)}
          >
            <span className="compte-code">
              {compte.isChild && '• '}
              {compte.numero}
            </span>
            <span className="compte-libelle">{compte.libelle}</span>
            <span className="compte-montant">{formatCurrency(compte.montant)}</span>
          </div>
        ))}
        <div className="compte-resultat-row total-row">
          <span className="compte-code"></span>
          <span className="compte-libelle">
            <strong>Total {data.label || title}</strong>
          </span>
          <span className="compte-montant">
            <strong>{formatCurrency(data.total)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
});

function CompteResultatDisplay({ data, fecData: fecDataProp }) {
  const [selectedParent, setSelectedParent] = useState(null);

  // Essayer d'obtenir les données FEC depuis le contexte si pas passées en prop
  const fecContext = useContext(FECContext);
  const fecData = fecDataProp || (fecContext?.parseResult1 || null);

  if (!data) {
    return <div className="compte-resultat-empty">Aucune donnée disponible</div>;
  }

  // Optimisation : Pré-calculer la map des comptes enfants une seule fois quand fecData change
  const accountsMap = useMemo(() => {
    if (!fecData || !fecData.data || !Array.isArray(fecData.data)) return null;

    console.log('CompteResultatDisplay - Pré-calcul de la map des comptes...');
    const map = {};

    // On ne filtre que les comptes de résultat pour réduire la taille de la map
    fecData.data.forEach(row => {
      const compteNum = String(row.compteNum || '').trim();
      // Optimisation simple: les comptes de résultat commencent par 6 ou 7
      if (!compteNum.startsWith('6') && !compteNum.startsWith('7')) return;

      if (!map[compteNum]) {
        map[compteNum] = {
          numero: compteNum,
          libelle: row.compteLibelle || getAccountLabel(compteNum) || `Compte ${compteNum}`,
          debit: 0,
          credit: 0
        };
      }

      map[compteNum].debit += parseFloat(row.debit || 0);
      map[compteNum].credit += parseFloat(row.credit || 0);
    });

    return map;
  }, [fecData]);

  // Fonction pour collecter tous les comptes enfants d'un parent
  const getChildAccounts = useCallback((parentNumero) => {
    if (!parentNumero) return [];

    const children = [];
    const parentNumeroStr = String(parentNumero).trim();

    // Si on a la map pré-calculée, on l'utilise (beaucoup plus rapide)
    if (accountsMap) {
      Object.values(accountsMap).forEach(compte => {
        // Vérifier si ce compte commence par le numéro du parent ET est plus long que le parent
        if (compte.numero.startsWith(parentNumeroStr) && compte.numero.length > parentNumeroStr.length) {
          // Utiliser AccountClassifier pour vérifier que c'est bien un compte de résultat (double check)
          const accountType = getAccountType(compte.numero);

          if (accountType === 'COMPTE_RESULTAT') {
            const resultatPosition = getResultatPosition(compte.numero);
            let solde = 0;

            if (resultatPosition === 'CHARGE') {
              solde = compte.debit - compte.credit;
            } else if (resultatPosition === 'PRODUIT') {
              solde = compte.credit - compte.debit;
            }

            children.push({
              ...compte,
              solde,
              montant: solde
            });
          }
        }
      });

      // Trier par numéro de compte
      children.sort((a, b) => a.numero.localeCompare(b.numero));

    } else {
      // Fallback : utiliser la structure hiérarchique si disponible
      if (data.formatHierarchique) {
        const sections = [
          data.charges?.exploitation,
          data.charges?.financieres,
          data.charges?.exceptionnelles,
          data.charges?.participationImpots,
          data.produits?.exploitation,
          data.produits?.financiers,
          data.produits?.exceptionnels
        ].filter(Boolean);

        sections.forEach(section => {
          if (section.comptes) {
            section.comptes.forEach(compte => {
              if (compte.isChild && compte.parent === parentNumero) {
                children.push({
                  ...compte,
                  sectionLabel: section.label,
                  solde: compte.montant
                });
              }
            });
          }
        });
      }
    }

    return children;
  }, [accountsMap, data]);

  const childAccounts = useMemo(() => selectedParent ? getChildAccounts(selectedParent) : [], [selectedParent, getChildAccounts]);

  const selectedParentInfo = useMemo(() => {
    if (!selectedParent) return null;

    const sections = [
      data.charges?.exploitation,
      data.charges?.financieres,
      data.charges?.exceptionnelles,
      data.charges?.participationImpots,
      data.produits?.exploitation,
      data.produits?.financiers,
      data.produits?.exceptionnels
    ].filter(Boolean);

    for (const section of sections) {
      if (section.comptes) {
        const parent = section.comptes.find(c => !c.isChild && c.numero === selectedParent);
        if (parent) {
          return { ...parent, sectionLabel: section.label };
        }
      }
    }
    return null;
  }, [selectedParent, data]);

  // Gérer la structure hiérarchique (formatHierarchique: true) - PRIORITÉ
  if (data.formatHierarchique) {
    return (
      <div className="compte-resultat-container">

        {/* DIAGRAMME DE SANKEY (NOUVEAU) */}
        <RevenueSankey data={data} />

        <div className="compte-resultat-grid">
          {/* CHARGES */}
          <div className="colonne-charges">
            <h2 className="colonne-title charges-title">CHARGES</h2>

            <ResultatSection
              title="CHARGES D'EXPLOITATION"
              data={data.charges?.exploitation}
              selectedParent={selectedParent}
              onSelectParent={setSelectedParent}
              className="charges-title"
            />

            <ResultatSection
              title="CHARGES FINANCIÈRES"
              data={data.charges?.financieres}
              selectedParent={selectedParent}
              onSelectParent={setSelectedParent}
              className="charges-title"
            />

            <ResultatSection
              title="CHARGES EXCEPTIONNELLES"
              data={data.charges?.exceptionnelles}
              selectedParent={selectedParent}
              onSelectParent={setSelectedParent}
              className="charges-title"
            />

            <ResultatSection
              title="PARTICIPATION ET IMPÔTS"
              data={data.charges?.participationImpots}
              selectedParent={selectedParent}
              onSelectParent={setSelectedParent}
              className="charges-title"
            />
          </div>

          {/* PRODUITS */}
          <div className="colonne-produits">
            <h2 className="colonne-title produits-title">PRODUITS</h2>

            <ResultatSection
              title="PRODUITS D'EXPLOITATION"
              data={data.produits?.exploitation}
              selectedParent={selectedParent}
              onSelectParent={setSelectedParent}
              className="produits-title"
            />

            <ResultatSection
              title="PRODUITS FINANCIERS"
              data={data.produits?.financiers}
              selectedParent={selectedParent}
              onSelectParent={setSelectedParent}
              className="produits-title"
            />

            <ResultatSection
              title="PRODUITS EXCEPTIONNELS"
              data={data.produits?.exceptionnels}
              selectedParent={selectedParent}
              onSelectParent={setSelectedParent}
              className="produits-title"
            />
          </div>
        </div>

        {/* RÉSULTATS INTERMÉDIAIRES */}
        {data.resultatsIntermediaires && (
          <div className="resultats-intermediaires">
            <div className="resultat">
              <strong>A - Résultat d'Exploitation:</strong>
              <span className={data.resultatsIntermediaires.exploitation >= 0 ? 'positif' : 'negatif'}>
                {formatCurrency(data.resultatsIntermediaires.exploitation)}
              </span>
            </div>

            <div className="resultat">
              <strong>B - Résultat Financier:</strong>
              <span className={data.resultatsIntermediaires.financier >= 0 ? 'positif' : 'negatif'}>
                {formatCurrency(data.resultatsIntermediaires.financier)}
              </span>
            </div>

            <div className="resultat">
              <strong>C - Résultat Courant (A + B):</strong>
              <span className={data.resultatsIntermediaires.courant >= 0 ? 'positif' : 'negatif'}>
                {formatCurrency(data.resultatsIntermediaires.courant)}
              </span>
            </div>

            <div className="resultat">
              <strong>D - Résultat Exceptionnel:</strong>
              <span className={data.resultatsIntermediaires.exceptionnel >= 0 ? 'positif' : 'negatif'}>
                {formatCurrency(data.resultatsIntermediaires.exceptionnel)}
              </span>
            </div>

            <div className="resultat-net">
              <strong>N - RÉSULTAT NET:</strong>
              <span className={data.resultatsIntermediaires.net >= 0 ? 'positif' : 'negatif'}>
                {formatCurrency(data.resultatsIntermediaires.net)}
              </span>
            </div>
          </div>
        )}

        {/* DÉTAILS DES COMPTES ENFANTS */}
        {selectedParent && (
          <div className="children-details-section">
            <div className="children-details-header">
              <h3>
                Détail par compte: {selectedParentInfo?.sectionLabel || ''} - Classe {selectedParent}
                {selectedParentInfo?.libelle && ` (${selectedParentInfo.libelle})`}
              </h3>
              <button
                className="close-details-btn"
                onClick={() => setSelectedParent(null)}
                title="Fermer"
              >
                ✕
              </button>
            </div>
            {selectedParentInfo && (
              <div className="children-details-parent">
                <span className="parent-code">{selectedParentInfo.numero}</span>
                <span className="parent-libelle">{selectedParentInfo.libelle}</span>
                <span className="parent-montant">{formatCurrency(selectedParentInfo.montant || 0)}</span>
                <span className="parent-section">{selectedParentInfo.sectionLabel}</span>
              </div>
            )}
            <div className="children-details-table">
              <div className="children-details-row header-row">
                <span className="child-code">Numéro de compte</span>
                <span className="child-libelle">Libellé du compte</span>
                <span className="child-debit">Débit</span>
                <span className="child-credit">Crédit</span>
                <span className="child-montant">Solde</span>
              </div>
              {childAccounts.length > 0 ? (
                <>
                  {childAccounts.map((compte, idx) => (
                    <div key={idx} className="children-details-row">
                      <span className="child-code">{compte.numero}</span>
                      <span className="child-libelle">{compte.libelle}</span>
                      <span className="child-debit">{formatCurrency(compte.debit || 0)}</span>
                      <span className="child-credit">{formatCurrency(compte.credit || 0)}</span>
                      <span className={`child-montant ${(compte.solde || compte.montant || 0) < 0 ? 'negative' : ''}`}>
                        {formatCurrency(compte.solde || compte.montant || 0)}
                      </span>
                    </div>
                  ))}
                  <div className="children-details-row total-row">
                    <span className="child-code"></span>
                    <span className="child-libelle"><strong>Total:</strong></span>
                    <span className="child-debit">
                      <strong>{formatCurrency(childAccounts.reduce((sum, c) => sum + (c.debit || 0), 0))}</strong>
                    </span>
                    <span className="child-credit">
                      <strong>{formatCurrency(childAccounts.reduce((sum, c) => sum + (c.credit || 0), 0))}</strong>
                    </span>
                    <span className={`child-montant ${childAccounts.reduce((sum, c) => sum + (c.solde || c.montant || 0), 0) < 0 ? 'negative' : ''}`}>
                      <strong>{formatCurrency(childAccounts.reduce((sum, c) => sum + (c.solde || c.montant || 0), 0))}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className="children-details-row">
                  <span className="child-code" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem', color: '#999' }}>
                    Aucun compte enfant trouvé
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Gérer la structure formatée (formatFormate: true)
  if (data.formatFormate) {
    return (
      <div className="compte-resultat-container">
        {/* DIAGRAMME DE SANKEY (NOUVEAU) */}
        <RevenueSankey data={data} />

        {/* CHARGES D'EXPLOITATION */}
        {data.chargesExploitation && (
          <div className="compte-resultat-section">
            <div className="section-title charges-title">
              {data.chargesExploitation.titre || 'CHARGES D\'EXPLOITATION'}
            </div>
            <div className="compte-resultat-table">
              {data.chargesExploitation.lignes && data.chargesExploitation.lignes.map((ligne, idx) => (
                <div key={idx} className={`compte-resultat-row ${ligne.style || 'ligne'}`}>
                  <span className="compte-code">{ligne.code}</span>
                  <span className="compte-libelle">{ligne.libelle}</span>
                  <span className="compte-montant">{formatCurrency(ligne.montant)}</span>
                </div>
              ))}
              {data.chargesExploitation.total && (
                <div className="compte-resultat-row total-row">
                  <span className="compte-code"></span>
                  <span className="compte-libelle">{data.chargesExploitation.total.libelle || 'TOTAL CHARGES D\'EXPLOITATION'}</span>
                  <span className="compte-montant">{formatCurrency(data.chargesExploitation.total.montant)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRODUITS D'EXPLOITATION */}
        {data.produitsExploitation && (
          <div className="compte-resultat-section">
            <div className="section-title produits-title">
              {data.produitsExploitation.titre || 'PRODUITS D\'EXPLOITATION'}
            </div>
            <div className="compte-resultat-table">
              {data.produitsExploitation.lignes && data.produitsExploitation.lignes.map((ligne, idx) => (
                <div key={idx} className={`compte-resultat-row ${ligne.style || 'ligne'}`}>
                  <span className="compte-code">{ligne.code}</span>
                  <span className="compte-libelle">{ligne.libelle}</span>
                  <span className="compte-montant">{formatCurrency(ligne.montant)}</span>
                </div>
              ))}
              {data.produitsExploitation.total && (
                <div className="compte-resultat-row total-row">
                  <span className="compte-code"></span>
                  <span className="compte-libelle">{data.produitsExploitation.total.libelle || 'TOTAL PRODUITS D\'EXPLOITATION'}</span>
                  <span className="compte-montant">{formatCurrency(data.produitsExploitation.total.montant)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RÉSULTAT D'EXPLOITATION */}
        {data.chargesExploitation?.total && data.produitsExploitation?.total && (
          <div className="resultat-line">
            <span>RÉSULTAT D'EXPLOITATION</span>
            <span className={data.resultatExercice >= 0 ? 'benefice' : 'perte'}>
              {formatCurrency(Math.abs(data.resultatExercice))}
            </span>
          </div>
        )}

        {/* CHARGES FINANCIERES */}
        {data.chargesFinancier && data.chargesFinancier.lignes && data.chargesFinancier.lignes.length > 0 && (
          <div className="compte-resultat-section">
            <div className="section-title charges-title">
              {data.chargesFinancier.titre || 'CHARGES FINANCIÈRES'}
            </div>
            <div className="compte-resultat-table">
              {data.chargesFinancier.lignes.map((ligne, idx) => (
                <div key={idx} className={`compte-resultat-row ${ligne.style || 'ligne'}`}>
                  <span className="compte-code">{ligne.code}</span>
                  <span className="compte-libelle">{ligne.libelle}</span>
                  <span className="compte-montant">{formatCurrency(ligne.montant)}</span>
                </div>
              ))}
              {data.chargesFinancier.total && (
                <div className="compte-resultat-row total-row">
                  <span className="compte-code"></span>
                  <span className="compte-libelle">{data.chargesFinancier.total.libelle || 'TOTAL CHARGES FINANCIÈRES'}</span>
                  <span className="compte-montant">{formatCurrency(data.chargesFinancier.total.montant)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRODUITS FINANCIERS */}
        {data.produitsFinancier && data.produitsFinancier.lignes && data.produitsFinancier.lignes.length > 0 && (
          <div className="compte-resultat-section">
            <div className="section-title produits-title">
              {data.produitsFinancier.titre || 'PRODUITS FINANCIERS'}
            </div>
            <div className="compte-resultat-table">
              {data.produitsFinancier.lignes.map((ligne, idx) => (
                <div key={idx} className={`compte-resultat-row ${ligne.style || 'ligne'}`}>
                  <span className="compte-code">{ligne.code}</span>
                  <span className="compte-libelle">{ligne.libelle}</span>
                  <span className="compte-montant">{formatCurrency(ligne.montant)}</span>
                </div>
              ))}
              {data.produitsFinancier.total && (
                <div className="compte-resultat-row total-row">
                  <span className="compte-code"></span>
                  <span className="compte-libelle">{data.produitsFinancier.total.libelle || 'TOTAL PRODUITS FINANCIERS'}</span>
                  <span className="compte-montant">{formatCurrency(data.produitsFinancier.total.montant)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RÉSULTAT FINANCIER */}
        {data.chargesFinancier?.total && data.produitsFinancier?.total && (
          <div className="resultat-line">
            <span>RÉSULTAT FINANCIER</span>
            <span className={(data.produitsFinancier.total.montant - data.chargesFinancier.total.montant) >= 0 ? 'benefice' : 'perte'}>
              {formatCurrency(Math.abs(data.produitsFinancier.total.montant - data.chargesFinancier.total.montant))}
            </span>
          </div>
        )}

        {/* RÉSULTAT NET */}
        {data.resultatExercice !== undefined && (
          <div className="resultat-line resultat-net">
            <span>RÉSULTAT NET</span>
            <span className={data.resultatExercice >= 0 ? 'benefice' : 'perte'}>
              {formatCurrency(Math.abs(data.resultatExercice))}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Structure classique (compatibilité)
  const chargesExploitation = data.charges || [];
  const produitsExploitation = data.produits || [];

  return (
    <div className="compte-resultat-container">
      {/* DIAGRAMME DE SANKEY (NOUVEAU) */}
      <RevenueSankey data={data} />

      {/* CHARGES D'EXPLOITATION */}
      <div className="compte-resultat-section">
        <div className="section-title charges-title">
          CHARGES D'EXPLOITATION
        </div>
        <div className="compte-resultat-table">
          {chargesExploitation.map((ligne, idx) => (
            <div key={idx} className="compte-resultat-row ligne">
              <span className="compte-code">{ligne.classe}</span>
              <span className="compte-libelle">{ligne.libelle || getAccountLabel(ligne.classe)}</span>
              <span className="compte-montant">{formatCurrency(ligne.solde || 0)}</span>
            </div>
          ))}
          {data.totalCharges !== undefined && (
            <div className="compte-resultat-row total-row">
              <span className="compte-code"></span>
              <span className="compte-libelle">TOTAL CHARGES D'EXPLOITATION</span>
              <span className="compte-montant">{formatCurrency(data.totalCharges)}</span>
            </div>
          )}
        </div>
      </div>

      {/* PRODUITS D'EXPLOITATION */}
      <div className="compte-resultat-section">
        <div className="section-title produits-title">
          PRODUITS D'EXPLOITATION
        </div>
        <div className="compte-resultat-table">
          {produitsExploitation.map((ligne, idx) => (
            <div key={idx} className="compte-resultat-row ligne">
              <span className="compte-code">{ligne.classe}</span>
              <span className="compte-libelle">{ligne.libelle || getAccountLabel(ligne.classe)}</span>
              <span className="compte-montant">{formatCurrency(ligne.solde || 0)}</span>
            </div>
          ))}
          {data.totalProduits !== undefined && (
            <div className="compte-resultat-row total-row">
              <span className="compte-code"></span>
              <span className="compte-libelle">TOTAL PRODUITS D'EXPLOITATION</span>
              <span className="compte-montant">{formatCurrency(data.totalProduits)}</span>
            </div>
          )}
        </div>
      </div>

      {/* RÉSULTAT D'EXPLOITATION */}
      {data.resultatExercice !== undefined && (
        <div className="resultat-line">
          <span>RÉSULTAT D'EXPLOITATION</span>
          <span className={data.resultatExercice >= 0 ? 'benefice' : 'perte'}>
            {formatCurrency(Math.abs(data.resultatExercice))}
          </span>
        </div>
      )}
    </div>
  );
}

export default CompteResultatDisplay;
