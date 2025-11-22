import React, { useState, useMemo } from 'react';

const BilanView = ({ 
  generateBilan, 
  parseResult1, 
  parseResult2,
  showBilanN,
  setShowBilanN,
  showBilanN1,
  setShowBilanN1,
  showBilanComparaison,
  setShowBilanComparaison,
  selectedClasse,
  setSelectedClasse,
  getBilanDetails
}) => {
  const [selectedCompte, setSelectedCompte] = useState(null);
  const [showAuxiliaires, setShowAuxiliaires] = useState(false);

  // Générer les bilans N et N-1
  const bilanN = generateBilan ? generateBilan(parseResult1) : null;
  const bilanN1 = generateBilan && parseResult2 ? generateBilan(parseResult2) : null;
  
  // Fonction pour fusionner deux comptes et calculer la variation
  const fusionnerComptes = (compteN, compteN1) => {
    // Pour les immobilisations, utiliser net, sinon utiliser montant
    const montantN = compteN?.net !== undefined ? compteN.net : (compteN?.montant || 0);
    const montantN1 = compteN1?.net !== undefined ? compteN1.net : (compteN1?.montant || 0);
    const variation = montantN - montantN1;
    const variationPourcent = montantN1 !== 0 ? (variation / montantN1) * 100 : (montantN !== 0 ? 100 : 0);
    
    // Stocker séparément les valeurs pour chaque exercice (important pour les immobilisations)
    const brutN = compteN?.brut !== undefined ? compteN.brut : 0;
    const brutN1 = compteN1?.brut !== undefined ? compteN1.brut : 0;
    const amortissementsN = compteN?.amortissements !== undefined ? compteN.amortissements : 0;
    const amortissementsN1 = compteN1?.amortissements !== undefined ? compteN1.amortissements : 0;
    const netN = compteN?.net !== undefined ? compteN.net : montantN;
    const netN1 = compteN1?.net !== undefined ? compteN1.net : montantN1;
    
    return {
      numero: compteN?.numero || compteN1?.numero || '',
      libelle: compteN?.libelle || compteN1?.libelle || '',
      montantN: montantN,
      montantN1: montantN1,
      variation: variation,
      variationPourcent: variationPourcent,
      // Valeurs séparées par exercice pour les immobilisations
      brutN: brutN,
      brutN1: brutN1,
      amortissementsN: amortissementsN,
      amortissementsN1: amortissementsN1,
      netN: netN,
      netN1: netN1,
      // Valeurs de compatibilité (pour les comptes non-immobilisations)
      brut: brutN || brutN1,
      amortissements: amortissementsN || amortissementsN1,
      net: netN || netN1,
      auxiliaires: compteN?.auxiliaires || compteN1?.auxiliaires
    };
  };

  // Fonction pour fusionner deux groupes
  const fusionnerGroupes = (groupeN, groupeN1) => {
    const comptesFusionnes = [];
    const comptesMap = new Map();
    
    // Indexer les comptes N
    if (groupeN?.comptes) {
      groupeN.comptes.forEach(compte => {
        comptesMap.set(compte.numero, { compteN: compte, compteN1: null });
      });
    }
    
    // Indexer les comptes N-1
    if (groupeN1?.comptes) {
      groupeN1.comptes.forEach(compte => {
        if (comptesMap.has(compte.numero)) {
          comptesMap.get(compte.numero).compteN1 = compte;
        } else {
          comptesMap.set(compte.numero, { compteN: null, compteN1: compte });
        }
      });
    }
    
    // Fusionner les comptes
    comptesMap.forEach(({ compteN, compteN1 }) => {
      comptesFusionnes.push(fusionnerComptes(compteN, compteN1));
    });
    
    return {
      titre: groupeN?.titre || groupeN1?.titre || '',
      comptes: comptesFusionnes
    };
  };

  // Fonction pour fusionner deux sections (actif ou passif)
  const fusionnerSections = (sectionN, sectionN1) => {
    const result = {};
    
    // Parcourir les parties (immobilise, circulant, etc.)
    Object.keys(sectionN || sectionN1 || {}).forEach(partieKey => {
      const partieN = sectionN?.[partieKey];
      const partieN1 = sectionN1?.[partieKey];
      
      if (partieN || partieN1) {
        result[partieKey] = {
          titre: partieN?.titre || partieN1?.titre || '',
          groupes: []
        };
        
        const groupesMap = new Map();
        
        // Indexer les groupes N
        if (partieN?.groupes) {
          partieN.groupes.forEach(groupe => {
            groupesMap.set(groupe.titre, { groupeN: groupe, groupeN1: null });
          });
        }
        
        // Indexer les groupes N-1
        if (partieN1?.groupes) {
          partieN1.groupes.forEach(groupe => {
            if (groupesMap.has(groupe.titre)) {
              groupesMap.get(groupe.titre).groupeN1 = groupe;
            } else {
              groupesMap.set(groupe.titre, { groupeN: null, groupeN1: groupe });
            }
          });
        }
        
        // Fusionner les groupes
        groupesMap.forEach(({ groupeN, groupeN1 }) => {
          const groupeFusionne = fusionnerGroupes(groupeN, groupeN1);
          if (groupeFusionne.comptes.length > 0) {
            result[partieKey].groupes.push(groupeFusionne);
          }
        });
      }
    });
    
    return result;
  };

  // Fusionner les bilans
  const bilanFusionne = useMemo(() => {
    if (!bilanN) return null;
    
    return {
      actif: fusionnerSections(bilanN.actif, bilanN1?.actif),
      passif: fusionnerSections(bilanN.passif, bilanN1?.passif)
    };
  }, [bilanN, bilanN1]);
  
  // Debug: log pour voir ce qui est retourné
  console.log('BilanView - bilanN:', bilanN);
  console.log('BilanView - bilanN1:', bilanN1);
  console.log('BilanView - bilanFusionne:', bilanFusionne);

  const formatCurrency = (montant) => {
    if (montant === undefined || montant === null) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant);
  };

  const renderCompte = (compte, type, key) => {
    const hasAuxiliaires = compte.auxiliaires && compte.auxiliaires.length > 0;
    
    // Utiliser les valeurs fusionnées si disponibles
    const montantN = compte.montantN !== undefined ? compte.montantN : (compte.net || compte.montant || 0);
    const montantN1 = compte.montantN1 !== undefined ? compte.montantN1 : 0;
    const variation = compte.variation !== undefined ? compte.variation : (montantN - montantN1);
    const variationPourcent = compte.variationPourcent !== undefined ? compte.variationPourcent : (montantN1 !== 0 ? (variation / montantN1) * 100 : 0);
    
    const getVariationColor = (val) => {
      if (val > 0) return '#4CAF50';
      if (val < 0) return '#f44336';
      return '#666';
    };
    
    return (
      <div 
        key={key}
        className={`compte-row ${hasAuxiliaires ? 'has-auxiliaires' : ''}`}
        onClick={() => {
          if (hasAuxiliaires) {
            setSelectedCompte(compte);
            setShowAuxiliaires(true);
          }
        }}
        style={{ 
          cursor: hasAuxiliaires ? 'pointer' : 'default',
          padding: '8px 12px',
          borderBottom: '1px solid #eee'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>
              {compte.numero}
            </span>
            <span>{compte.libelle}</span>
            {hasAuxiliaires && (
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '0.9em', 
                color: '#666' 
              }}>
                ({compte.auxiliaires.length} auxiliaires)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {showBilanN && (
              <div style={{ fontWeight: 'bold', textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.9em', color: '#666' }}>N</div>
                <div>{formatCurrency(montantN)}</div>
              </div>
            )}
            {showBilanN1 && (
              <div style={{ fontWeight: 'bold', textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.9em', color: '#666' }}>N-1</div>
                <div>{formatCurrency(montantN1)}</div>
              </div>
            )}
            {showBilanComparaison && (
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.9em', color: '#666' }}>Var</div>
                <div style={{ fontWeight: 'bold', color: getVariationColor(variation) }}>
                  {formatCurrency(variation)}
                </div>
                <div style={{ fontSize: '0.85em', color: getVariationColor(variation) }}>
                  ({variationPourcent >= 0 ? '+' : ''}{variationPourcent.toFixed(1)}%)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGroupe = (groupe, type, key) => {
    if (!groupe.comptes || groupe.comptes.length === 0) return null;

    // Pour les immobilisations, utiliser netN/netN1, sinon utiliser montantN/montantN1
    const totalN = groupe.comptes.reduce((sum, c) => {
      const val = c.netN !== undefined ? c.netN : (c.montantN !== undefined ? c.montantN : (c.net || c.montant || 0));
      return sum + val;
    }, 0);
    const totalN1 = groupe.comptes.reduce((sum, c) => {
      const val = c.netN1 !== undefined ? c.netN1 : (c.montantN1 !== undefined ? c.montantN1 : 0);
      return sum + val;
    }, 0);
    const totalVar = totalN - totalN1;
    const totalVarPourcent = totalN1 !== 0 ? (totalVar / totalN1) * 100 : (totalN !== 0 ? 100 : 0);
    
    const getVariationColor = (val) => {
      if (val > 0) return '#4CAF50';
      if (val < 0) return '#f44336';
      return '#666';
    };

    return (
      <div key={key} style={{ marginBottom: '20px' }}>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '1.1em',
          padding: '10px 12px',
          backgroundColor: '#f5f5f5',
          borderLeft: '4px solid #4CAF50'
        }}>
          {groupe.titre}
        </div>
        {groupe.comptes.map((compte, index) => 
          renderCompte(compte, type, compte.numero || `compte-${index}`)
        )}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          padding: '8px 12px',
          fontWeight: 'bold',
          borderTop: '2px solid #333'
        }}>
          <span>Total {groupe.titre}</span>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {showBilanN && (
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.9em', color: '#666' }}>N</div>
                <div>{formatCurrency(totalN)}</div>
              </div>
            )}
            {showBilanN1 && (
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.9em', color: '#666' }}>N-1</div>
                <div>{formatCurrency(totalN1)}</div>
              </div>
            )}
            {showBilanComparaison && (
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.9em', color: '#666' }}>Var</div>
                <div style={{ color: getVariationColor(totalVar) }}>
                  {formatCurrency(totalVar)}
                </div>
                <div style={{ fontSize: '0.85em', color: getVariationColor(totalVar) }}>
                  ({totalVarPourcent >= 0 ? '+' : ''}{totalVarPourcent.toFixed(1)}%)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (section, titre, type) => {
    const totauxN = Object.values(section).reduce((total, partie) => {
      if (partie.groupes) {
        partie.groupes.forEach(groupe => {
          if (groupe.comptes) {
            total += groupe.comptes.reduce((sum, c) => {
              const val = c.netN !== undefined ? c.netN : (c.montantN !== undefined ? c.montantN : (c.net || c.montant || 0));
              return sum + val;
            }, 0);
          }
        });
      }
      return total;
    }, 0);
    
    const totauxN1 = Object.values(section).reduce((total, partie) => {
      if (partie.groupes) {
        partie.groupes.forEach(groupe => {
          if (groupe.comptes) {
            total += groupe.comptes.reduce((sum, c) => {
              const val = c.netN1 !== undefined ? c.netN1 : (c.montantN1 !== undefined ? c.montantN1 : 0);
              return sum + val;
            }, 0);
          }
        });
      }
      return total;
    }, 0);
    
    const totauxVar = totauxN - totauxN1;
    const totauxVarPourcent = totauxN1 !== 0 ? (totauxVar / totauxN1) * 100 : (totauxN !== 0 ? 100 : 0);
    
    const getVariationColor = (val) => {
      if (val > 0) return '#4CAF50';
      if (val < 0) return '#f44336';
      return '#fff';
    };

    return (
      <div style={{ 
        width: '48%',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <h2 style={{ 
          margin: '0 0 20px 0',
          paddingBottom: '10px',
          borderBottom: '3px solid #4CAF50'
        }}>
          {titre}
        </h2>

        {Object.values(section).map((partie, partieIndex) => (
          <div key={partie.titre || `partie-${partieIndex}`} style={{ marginBottom: '30px' }}>
            <h3 style={{ 
              color: '#4CAF50',
              fontSize: '1.2em',
              marginBottom: '15px'
            }}>
              {partie.titre}
            </h3>
            {partie.groupes && partie.groupes
              .map((groupe, groupeIndex) => 
                renderGroupe(groupe, type, groupe.titre || `groupe-${partieIndex}-${groupeIndex}`)
              )
              .filter(Boolean)
            }
          </div>
        ))}

        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#4CAF50',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.2em',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>TOTAL {titre.toUpperCase()}</span>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {showBilanN && (
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.9em', opacity: 0.9 }}>N</div>
                <div>{formatCurrency(totauxN)}</div>
              </div>
            )}
            {showBilanN1 && (
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.9em', opacity: 0.9 }}>N-1</div>
                <div>{formatCurrency(totauxN1)}</div>
              </div>
            )}
            {showBilanComparaison && (
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Var</div>
                <div style={{ color: getVariationColor(totauxVar) }}>
                  {formatCurrency(totauxVar)}
                </div>
                <div style={{ fontSize: '0.85em', color: getVariationColor(totauxVar) }}>
                  ({totauxVarPourcent >= 0 ? '+' : ''}{totauxVarPourcent.toFixed(1)}%)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderModalAuxiliaires = () => {
    if (!selectedCompte || !showAuxiliaires) return null;

    const totalDebiteurs = selectedCompte.auxiliaires
      .filter(aux => aux.solde > 0)
      .reduce((sum, aux) => sum + aux.solde, 0);

    const totalCrediteurs = selectedCompte.auxiliaires
      .filter(aux => aux.solde < 0)
      .reduce((sum, aux) => sum + Math.abs(aux.solde), 0);

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflow: 'auto',
          width: '90%'
        }}>
          <h3 style={{ marginTop: 0 }}>
            Détail par compte : {selectedCompte.numero} - {selectedCompte.libelle}
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <strong>Total affiché au bilan :</strong> {formatCurrency(selectedCompte.montant)}
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ color: '#4CAF50' }}>
              Auxiliaires débiteurs (Actif)
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Code</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Libellé</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Débit</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Crédit</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Solde</th>
                </tr>
              </thead>
              <tbody>
                {selectedCompte.auxiliaires
                  .filter(aux => aux.solde > 0)
                  .map(aux => (
                    <tr key={aux.auxiliaire} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{aux.auxiliaire}</td>
                      <td style={{ padding: '8px' }}>{aux.libelle}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {formatCurrency(aux.debit)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {formatCurrency(aux.credit)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                        {formatCurrency(aux.solde)}
                      </td>
                    </tr>
                  ))
                }
                <tr style={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>
                  <td colSpan="4" style={{ padding: '8px' }}>Total débiteurs</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {formatCurrency(totalDebiteurs)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ color: '#f44336' }}>
              Auxiliaires créditeurs (Passif)
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Code</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Libellé</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Débit</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Crédit</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Solde</th>
                </tr>
              </thead>
              <tbody>
                {selectedCompte.auxiliaires
                  .filter(aux => aux.solde < 0)
                  .map(aux => (
                    <tr key={aux.auxiliaire} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{aux.auxiliaire}</td>
                      <td style={{ padding: '8px' }}>{aux.libelle}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {formatCurrency(aux.debit)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {formatCurrency(aux.credit)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                        {formatCurrency(aux.solde)}
                      </td>
                    </tr>
                  ))
                }
                <tr style={{ fontWeight: 'bold', backgroundColor: '#ffebee' }}>
                  <td colSpan="4" style={{ padding: '8px' }}>Total créditeurs</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {formatCurrency(-totalCrediteurs)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ 
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <strong>⚠️ Principe PCG (non-compensation) :</strong>
            <ul style={{ marginTop: '10px', marginBottom: 0 }}>
              <li>Total débiteurs à l'actif : {formatCurrency(totalDebiteurs)}</li>
              <li>Total créditeurs au passif : {formatCurrency(totalCrediteurs)}</li>
              <li>Solde compensé (NON CONFORME) : {formatCurrency(totalDebiteurs - totalCrediteurs)}</li>
            </ul>
          </div>

          <button 
            onClick={() => {
              setShowAuxiliaires(false);
              setSelectedCompte(null);
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1em'
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    );
  };

  // Vérification de sécurité
  if (!bilanN) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#ffebee', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#c62828', fontWeight: 'bold' }}>
            Aucune donnée de bilan disponible
          </p>
          <p style={{ color: '#666', marginTop: '10px' }}>
            Le générateur de bilan n'a pas retourné de données. 
            Vérifiez que votre fichier FEC contient des comptes de bilan.
          </p>
        </div>
      </div>
    );
  }

  if (!bilanN.actif || !bilanN.passif) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#ffebee', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#c62828', fontWeight: 'bold' }}>
            Structure de données invalide
          </p>
          <p style={{ color: '#666', marginTop: '10px' }}>
            Le bilan ne contient pas les propriétés 'actif' et 'passif' attendues.
          </p>
        </div>
      </div>
    );
  }

  // Utiliser le bilan fusionné si disponible, sinon le bilan N
  const bilanAffiche = bilanFusionne || bilanN;

    const totauxN = {
    actif: Object.values(bilanAffiche.actif).reduce((total, partie) => {
      if (partie && partie.groupes) {
        partie.groupes.forEach(groupe => {
          if (groupe && groupe.comptes) {
            total += groupe.comptes.reduce((sum, c) => {
              const val = c.netN !== undefined ? c.netN : (c.montantN !== undefined ? c.montantN : (c.net || c.montant || 0));
              return sum + val;
            }, 0);
          }
        });
      }
      return total;
    }, 0),
    passif: Object.values(bilanAffiche.passif).reduce((total, partie) => {
      if (partie && partie.groupes) {
        partie.groupes.forEach(groupe => {
          if (groupe && groupe.comptes) {
            total += groupe.comptes.reduce((sum, c) => {
              const val = c.netN !== undefined ? c.netN : (c.montantN !== undefined ? c.montantN : (c.net || c.montant || 0));
              return sum + val;
            }, 0);
          }
        });
      }
      return total;
    }, 0)
  };

  const totauxN1 = {
    actif: Object.values(bilanAffiche.actif).reduce((total, partie) => {
      if (partie && partie.groupes) {
        partie.groupes.forEach(groupe => {
          if (groupe && groupe.comptes) {
            total += groupe.comptes.reduce((sum, c) => {
              const val = c.netN1 !== undefined ? c.netN1 : (c.montantN1 !== undefined ? c.montantN1 : 0);
              return sum + val;
            }, 0);
          }
        });
      }
      return total;
    }, 0),
    passif: Object.values(bilanAffiche.passif).reduce((total, partie) => {
      if (partie && partie.groupes) {
        partie.groupes.forEach(groupe => {
          if (groupe && groupe.comptes) {
            total += groupe.comptes.reduce((sum, c) => {
              const val = c.netN1 !== undefined ? c.netN1 : (c.montantN1 !== undefined ? c.montantN1 : 0);
              return sum + val;
            }, 0);
          }
        });
      }
      return total;
    }, 0)
  };

  const equilibreN = Math.abs(totauxN.actif - totauxN.passif) < 0.01;
  const equilibreN1 = Math.abs(totauxN1.actif - totauxN1.passif) < 0.01;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Bilan conforme PCG 2025
      </h1>

      {/* Checkboxes pour afficher/masquer les colonnes */}
      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showBilanN}
            onChange={(e) => {
              setShowBilanN(e.target.checked);
              // Si N est décoché et que N-1 est coché, activer automatiquement la variation
              if (!e.target.checked && showBilanN1 && parseResult2) {
                setShowBilanComparaison(true);
              }
            }}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 'bold' }}>Afficher N</span>
        </label>
        {parseResult2 && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showBilanN1}
                onChange={(e) => {
                  setShowBilanN1(e.target.checked);
                  // Si N-1 est coché et que N est aussi coché, activer automatiquement la variation
                  if (e.target.checked && showBilanN) {
                    setShowBilanComparaison(true);
                  }
                  // Si N-1 est décoché, décocher aussi la variation
                  if (!e.target.checked) {
                    setShowBilanComparaison(false);
                  }
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 'bold' }}>Afficher N-1</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showBilanComparaison}
                onChange={(e) => setShowBilanComparaison(e.target.checked)}
                disabled={!showBilanN || !showBilanN1}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  cursor: (!showBilanN || !showBilanN1) ? 'not-allowed' : 'pointer',
                  opacity: (!showBilanN || !showBilanN1) ? 0.5 : 1
                }}
              />
              <span style={{ 
                fontWeight: 'bold',
                opacity: (!showBilanN || !showBilanN1) ? 0.5 : 1
              }}>
                Afficher Variation
              </span>
            </label>
          </>
        )}
      </div>

      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: equilibreN ? '#e8f5e9' : '#ffebee',
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        <strong>
          {equilibreN ? '✓' : '✗'} Équilibre du bilan N : 
        </strong>
        {' '}Actif = {formatCurrency(totauxN.actif)} | 
        Passif = {formatCurrency(totauxN.passif)} | 
        Écart = {formatCurrency(Math.abs(totauxN.actif - totauxN.passif))}
        {parseResult2 && (
          <>
            <br />
            <strong style={{ marginTop: '10px', display: 'block' }}>
              {equilibreN1 ? '✓' : '✗'} Équilibre du bilan N-1 : 
            </strong>
            {' '}Actif = {formatCurrency(totauxN1.actif)} | 
            Passif = {formatCurrency(totauxN1.passif)} | 
            Écart = {formatCurrency(Math.abs(totauxN1.actif - totauxN1.passif))}
          </>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        {renderSection(bilanAffiche.actif, 'ACTIF', 'actif')}
        {renderSection(bilanAffiche.passif, 'PASSIF', 'passif')}
      </div>

      {renderModalAuxiliaires()}
    </div>
  );
};

export default BilanView;