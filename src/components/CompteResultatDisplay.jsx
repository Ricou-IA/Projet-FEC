import React, { useState, useContext } from 'react';
import { getAccountLabel } from '../utils/accountLabels';
import { formatCurrency } from '../utils/formatters';
import { getAccountType, getResultatPosition } from '../core/AccountClassifier';
import FECContext from '../context/FECContext';
import './CompteResultatDisplay.css';

function CompteResultatDisplay({ data, fecData: fecDataProp }) {
  const [selectedParent, setSelectedParent] = useState(null);
  
  // Essayer d'obtenir les données FEC depuis le contexte si pas passées en prop
  const fecContext = useContext(FECContext);
  const fecData = fecDataProp || (fecContext?.parseResult1 || null);
  
  if (fecData && !fecDataProp && fecContext) {
    console.log('CompteResultatDisplay - Utilisation des données FEC depuis le contexte');
  }

  if (!data) {
    return <div className="compte-resultat-empty">Aucune donnée disponible</div>;
  }

  // Fonction pour collecter tous les comptes enfants d'un parent depuis les données FEC brutes
  const getChildAccounts = (parentNumero) => {
    if (!parentNumero) return [];
    
    const children = [];
    
    console.log('getChildAccounts - parentNumero:', parentNumero);
    console.log('getChildAccounts - fecData:', fecData);
    
    // Si on a les données FEC brutes, les utiliser en priorité
    if (fecData && fecData.data && Array.isArray(fecData.data)) {
      console.log('getChildAccounts - Utilisation des données FEC brutes, nombre de lignes:', fecData.data.length);
      
      // Grouper les comptes par numéro de compte
      const accountsMap = {};
      
      fecData.data.forEach(row => {
        const compteNum = String(row.compteNum || '').trim();
        const parentNumeroStr = String(parentNumero).trim();
        
        // Vérifier si ce compte commence par le numéro du parent ET est plus long que le parent
        // Par exemple, si parent = "60", on cherche "600", "601", "602", etc. mais pas "60" lui-même
        // Mais on accepte aussi des comptes plus longs comme "6001", "6002", etc.
        if (compteNum.startsWith(parentNumeroStr) && compteNum.length > parentNumeroStr.length) {
          // Utiliser AccountClassifier pour vérifier que c'est un compte de résultat
          const accountType = getAccountType(compteNum);
          
          // Vérifier que c'est bien un compte de résultat
          if (accountType === 'COMPTE_RESULTAT') {
            if (!accountsMap[compteNum]) {
              accountsMap[compteNum] = {
                numero: compteNum,
                libelle: row.compteLibelle || getAccountLabel(compteNum) || `Compte ${compteNum}`,
                debit: 0,
                credit: 0,
                solde: 0
              };
            }
            
            accountsMap[compteNum].debit += parseFloat(row.debit || 0);
            accountsMap[compteNum].credit += parseFloat(row.credit || 0);
          }
        }
      });
      
      console.log('getChildAccounts - comptes trouvés dans accountsMap:', Object.keys(accountsMap).length);
      
      // Calculer les soldes selon le type de compte
      Object.values(accountsMap).forEach(compte => {
        const resultatPosition = getResultatPosition(compte.numero);
        if (resultatPosition === 'CHARGE') {
          compte.solde = compte.debit - compte.credit;
        } else if (resultatPosition === 'PRODUIT') {
          compte.solde = compte.credit - compte.debit;
        }
        
        children.push({
          ...compte,
          montant: compte.solde
        });
      });
      
      // Trier par numéro de compte
      children.sort((a, b) => a.numero.localeCompare(b.numero));
      
      console.log('getChildAccounts - nombre final de comptes enfants:', children.length);
      if (children.length > 0) {
        console.log('getChildAccounts - exemples de comptes enfants:', children.slice(0, 3));
      }
    } else {
      console.log('getChildAccounts - Pas de données FEC brutes, utilisation du fallback');
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
        
        console.log('getChildAccounts - fallback: nombre de comptes trouvés:', children.length);
      }
    }
    
    return children;
  };

  const childAccounts = selectedParent ? getChildAccounts(selectedParent) : [];
  const selectedParentInfo = selectedParent ? 
    (() => {
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
            console.log('selectedParentInfo trouvé:', { ...parent, sectionLabel: section.label });
            return { ...parent, sectionLabel: section.label };
          }
        }
      }
      console.log('selectedParentInfo non trouvé pour:', selectedParent);
      return null;
    })() : null;

  console.log('CompteResultatDisplay - selectedParent:', selectedParent);
  console.log('CompteResultatDisplay - childAccounts.length:', childAccounts.length);
  console.log('CompteResultatDisplay - selectedParentInfo:', selectedParentInfo);

  // Gérer la structure hiérarchique (formatHierarchique: true) - PRIORITÉ
  console.log('CompteResultatDisplay - Données reçues:', {
    formatHierarchique: data.formatHierarchique,
    hasCharges: !!data.charges,
    hasProduits: !!data.produits,
    chargesExploitation: data.charges?.exploitation?.comptes?.length || 0,
    totalChargesExploitation: data.charges?.exploitation?.total || 0
  });
  
  if (data.formatHierarchique) {
    return (
      <div className="compte-resultat-container">
        <div className="compte-resultat-grid">
          {/* CHARGES */}
          <div className="colonne-charges">
            <h2 className="colonne-title charges-title">CHARGES</h2>
            
            {/* CHARGES D'EXPLOITATION */}
            {data.charges?.exploitation && (
              <div className="compte-resultat-section">
                <div className="section-title charges-title">
                  {data.charges.exploitation.label || 'CHARGES D\'EXPLOITATION'}
                </div>
                <div className="compte-resultat-table">
                  {data.charges.exploitation.comptes.map((compte, idx) => (
                    <div 
                      key={idx} 
                      className={`compte-resultat-row ${compte.isChild ? 'compte-enfant' : 'compte-parent'} ${!compte.isChild ? 'clickable-parent' : ''} ${selectedParent === compte.numero ? 'selected-parent' : ''}`}
                      style={{ 
                        paddingLeft: compte.isChild ? '30px' : '0',
                        color: compte.isChild ? '#666' : '#000',
                        fontSize: compte.isChild ? '0.9em' : '1em',
                        cursor: compte.isChild ? 'default' : 'pointer'
                      }}
                      onClick={() => !compte.isChild && setSelectedParent(selectedParent === compte.numero ? null : compte.numero)}
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
                      <strong>Total {data.charges.exploitation.label || 'CHARGES D\'EXPLOITATION'}</strong>
                    </span>
                    <span className="compte-montant">
                      <strong>{formatCurrency(data.charges.exploitation.total)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CHARGES FINANCIÈRES */}
            {data.charges?.financieres && (
              <div className="compte-resultat-section">
                <div className="section-title charges-title">
                  {data.charges.financieres.label || 'CHARGES FINANCIÈRES'}
                </div>
                <div className="compte-resultat-table">
                  {data.charges.financieres.comptes.map((compte, idx) => (
                    <div 
                      key={idx} 
                      className={`compte-resultat-row ${compte.isChild ? 'compte-enfant' : 'compte-parent'} ${!compte.isChild ? 'clickable-parent' : ''} ${selectedParent === compte.numero ? 'selected-parent' : ''}`}
                      style={{ 
                        paddingLeft: compte.isChild ? '30px' : '0',
                        color: compte.isChild ? '#666' : '#000',
                        fontSize: compte.isChild ? '0.9em' : '1em',
                        cursor: compte.isChild ? 'default' : 'pointer'
                      }}
                      onClick={() => !compte.isChild && setSelectedParent(selectedParent === compte.numero ? null : compte.numero)}
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
                      <strong>Total {data.charges.financieres.label || 'CHARGES FINANCIÈRES'}</strong>
                    </span>
                    <span className="compte-montant">
                      <strong>{formatCurrency(data.charges.financieres.total)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CHARGES EXCEPTIONNELLES */}
            {data.charges?.exceptionnelles && (
              <div className="compte-resultat-section">
                <div className="section-title charges-title">
                  {data.charges.exceptionnelles.label || 'CHARGES EXCEPTIONNELLES'}
                </div>
                <div className="compte-resultat-table">
                  {data.charges.exceptionnelles.comptes.map((compte, idx) => (
                    <div 
                      key={idx} 
                      className={`compte-resultat-row ${compte.isChild ? 'compte-enfant' : 'compte-parent'} ${!compte.isChild ? 'clickable-parent' : ''} ${selectedParent === compte.numero ? 'selected-parent' : ''}`}
                      style={{ 
                        paddingLeft: compte.isChild ? '30px' : '0',
                        color: compte.isChild ? '#666' : '#000',
                        fontSize: compte.isChild ? '0.9em' : '1em',
                        cursor: compte.isChild ? 'default' : 'pointer'
                      }}
                      onClick={() => !compte.isChild && setSelectedParent(selectedParent === compte.numero ? null : compte.numero)}
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
                      <strong>Total {data.charges.exceptionnelles.label || 'CHARGES EXCEPTIONNELLES'}</strong>
                    </span>
                    <span className="compte-montant">
                      <strong>{formatCurrency(data.charges.exceptionnelles.total)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PARTICIPATION ET IMPÔTS */}
            {data.charges?.participationImpots && (
              <div className="compte-resultat-section">
                <div className="section-title charges-title">
                  {data.charges.participationImpots.label || 'PARTICIPATION ET IMPÔTS'}
                </div>
                <div className="compte-resultat-table">
                  {data.charges.participationImpots.comptes.map((compte, idx) => (
                    <div 
                      key={idx} 
                      className={`compte-resultat-row ${compte.isChild ? 'compte-enfant' : 'compte-parent'} ${!compte.isChild ? 'clickable-parent' : ''} ${selectedParent === compte.numero ? 'selected-parent' : ''}`}
                      style={{ 
                        paddingLeft: compte.isChild ? '30px' : '0',
                        color: compte.isChild ? '#666' : '#000',
                        fontSize: compte.isChild ? '0.9em' : '1em',
                        cursor: compte.isChild ? 'default' : 'pointer'
                      }}
                      onClick={() => !compte.isChild && setSelectedParent(selectedParent === compte.numero ? null : compte.numero)}
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
                      <strong>Total {data.charges.participationImpots.label || 'PARTICIPATION ET IMPÔTS'}</strong>
                    </span>
                    <span className="compte-montant">
                      <strong>{formatCurrency(data.charges.participationImpots.total)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PRODUITS */}
          <div className="colonne-produits">
            <h2 className="colonne-title produits-title">PRODUITS</h2>
            
            {/* PRODUITS D'EXPLOITATION */}
            {data.produits?.exploitation && (
              <div className="compte-resultat-section">
                <div className="section-title produits-title">
                  {data.produits.exploitation.label || 'PRODUITS D\'EXPLOITATION'}
                </div>
                <div className="compte-resultat-table">
                  {data.produits.exploitation.comptes.map((compte, idx) => (
                    <div 
                      key={idx} 
                      className={`compte-resultat-row ${compte.isChild ? 'compte-enfant' : 'compte-parent'} ${!compte.isChild ? 'clickable-parent' : ''} ${selectedParent === compte.numero ? 'selected-parent' : ''}`}
                      style={{ 
                        paddingLeft: compte.isChild ? '30px' : '0',
                        color: compte.isChild ? '#666' : '#000',
                        fontSize: compte.isChild ? '0.9em' : '1em',
                        cursor: compte.isChild ? 'default' : 'pointer'
                      }}
                      onClick={() => !compte.isChild && setSelectedParent(selectedParent === compte.numero ? null : compte.numero)}
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
                      <strong>Total {data.produits.exploitation.label || 'PRODUITS D\'EXPLOITATION'}</strong>
                    </span>
                    <span className="compte-montant">
                      <strong>{formatCurrency(data.produits.exploitation.total)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUITS FINANCIERS */}
            {data.produits?.financiers && (
              <div className="compte-resultat-section">
                <div className="section-title produits-title">
                  {data.produits.financiers.label || 'PRODUITS FINANCIERS'}
                </div>
                <div className="compte-resultat-table">
                  {data.produits.financiers.comptes.map((compte, idx) => (
                    <div 
                      key={idx} 
                      className={`compte-resultat-row ${compte.isChild ? 'compte-enfant' : 'compte-parent'} ${!compte.isChild ? 'clickable-parent' : ''} ${selectedParent === compte.numero ? 'selected-parent' : ''}`}
                      style={{ 
                        paddingLeft: compte.isChild ? '30px' : '0',
                        color: compte.isChild ? '#666' : '#000',
                        fontSize: compte.isChild ? '0.9em' : '1em',
                        cursor: compte.isChild ? 'default' : 'pointer'
                      }}
                      onClick={() => !compte.isChild && setSelectedParent(selectedParent === compte.numero ? null : compte.numero)}
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
                      <strong>Total {data.produits.financiers.label || 'PRODUITS FINANCIERS'}</strong>
                    </span>
                    <span className="compte-montant">
                      <strong>{formatCurrency(data.produits.financiers.total)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUITS EXCEPTIONNELS */}
            {data.produits?.exceptionnels && (
              <div className="compte-resultat-section">
                <div className="section-title produits-title">
                  {data.produits.exceptionnels.label || 'PRODUITS EXCEPTIONNELS'}
                </div>
                <div className="compte-resultat-table">
                  {data.produits.exceptionnels.comptes.map((compte, idx) => (
                    <div 
                      key={idx} 
                      className={`compte-resultat-row ${compte.isChild ? 'compte-enfant' : 'compte-parent'} ${!compte.isChild ? 'clickable-parent' : ''} ${selectedParent === compte.numero ? 'selected-parent' : ''}`}
                      style={{ 
                        paddingLeft: compte.isChild ? '30px' : '0',
                        color: compte.isChild ? '#666' : '#000',
                        fontSize: compte.isChild ? '0.9em' : '1em',
                        cursor: compte.isChild ? 'default' : 'pointer'
                      }}
                      onClick={() => !compte.isChild && setSelectedParent(selectedParent === compte.numero ? null : compte.numero)}
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
                      <strong>Total {data.produits.exceptionnels.label || 'PRODUITS EXCEPTIONNELS'}</strong>
                    </span>
                    <span className="compte-montant">
                      <strong>{formatCurrency(data.produits.exceptionnels.total)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
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

