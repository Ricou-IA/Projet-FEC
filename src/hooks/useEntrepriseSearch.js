import { useState } from 'react';

export const useEntrepriseSearch = () => {
  const [siren, setSiren] = useState('');
  const [entrepriseInfo, setEntrepriseInfo] = useState(null);
  const [loadingEntreprise, setLoadingEntreprise] = useState(false);
  const [sirenError, setSirenError] = useState(null);

  const searchEntreprise = async () => {
    if (!siren || siren.length !== 9 || !/^\d+$/.test(siren)) {
      setSirenError('Le SIREN doit contenir exactement 9 chiffres');
      return;
    }

    setLoadingEntreprise(true);
    setSirenError(null);

    try {
      const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche de l\'entreprise');
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const entreprise = data.results[0];
        
        let dirigeant = '';
        let codeNaf = entreprise.activite_principale || entreprise.code_activite_principale || '';
        let libelleNaf = entreprise.libelle_activite_principale || '';
        let formeJuridique = entreprise.libelle_forme_juridique || entreprise.forme_juridique || entreprise.nature_juridique || '';
        
        if (entreprise.dirigeants && entreprise.dirigeants.length > 0) {
          const premierDirigeant = entreprise.dirigeants[0];
          const prenom = premierDirigeant.prenom || '';
          const nom = premierDirigeant.nom || '';
          dirigeant = `${prenom} ${nom}`.trim();
          if (premierDirigeant.qualite) {
            dirigeant += ` (${premierDirigeant.qualite})`;
          }
        } else if (entreprise.representants && entreprise.representants.length > 0) {
          const premierRepresentant = entreprise.representants[0];
          const prenom = premierRepresentant.prenom || '';
          const nom = premierRepresentant.nom || '';
          dirigeant = `${prenom} ${nom}`.trim();
          if (premierRepresentant.qualite) {
            dirigeant += ` (${premierRepresentant.qualite})`;
          }
        }
        
        try {
          const detailResponse = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=1`);
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            if (detailData.results && detailData.results.length > 0) {
              const detail = detailData.results[0];
              
              if (!dirigeant) {
                if (detail.dirigeants && detail.dirigeants.length > 0) {
                  const premierDirigeant = detail.dirigeants[0];
                  const prenom = premierDirigeant.prenom || '';
                  const nom = premierDirigeant.nom || '';
                  dirigeant = `${prenom} ${nom}`.trim();
                  if (premierDirigeant.qualite) {
                    dirigeant += ` (${premierDirigeant.qualite})`;
                  }
                } else if (detail.representants && detail.representants.length > 0) {
                  const premierRepresentant = detail.representants[0];
                  const prenom = premierRepresentant.prenom || '';
                  const nom = premierRepresentant.nom || '';
                  dirigeant = `${prenom} ${nom}`.trim();
                  if (premierRepresentant.qualite) {
                    dirigeant += ` (${premierRepresentant.qualite})`;
                  }
                }
              }
              
              if (detail.activite_principale || detail.code_activite_principale) {
                codeNaf = detail.activite_principale || detail.code_activite_principale || codeNaf;
              }
              if (detail.libelle_activite_principale) {
                libelleNaf = detail.libelle_activite_principale;
              }
              
              if (detail.libelle_forme_juridique) {
                formeJuridique = detail.libelle_forme_juridique;
              } else if (detail.forme_juridique || detail.nature_juridique) {
                formeJuridique = detail.forme_juridique || detail.nature_juridique || formeJuridique;
              }
            }
          }
        } catch (err) {
          console.warn('Impossible de récupérer les détails complets:', err);
        }
        
        setEntrepriseInfo({
          siren: entreprise.siren,
          siret: entreprise.siret,
          nom: entreprise.nom_complet || entreprise.nom || '',
          formeJuridique: formeJuridique,
          codeNaf: codeNaf,
          libelleNaf: libelleNaf,
          dirigeant: dirigeant,
          adresse: entreprise.siege?.adresse || '',
          ville: entreprise.siege?.ville || '',
          codePostal: entreprise.siege?.code_postal || '',
          url: `https://annuaire-entreprises.data.gouv.fr/entreprise/${entreprise.siren}`
        });
      } else {
        throw new Error('Aucune entreprise trouvée avec ce SIREN');
      }
    } catch (err) {
      setSirenError(err.message);
      setEntrepriseInfo(null);
    } finally {
      setLoadingEntreprise(false);
    }
  };

  const handleSirenChange = (value) => {
    setSiren(value);
    setSirenError(null);
    if (value.length !== 9) {
      setEntrepriseInfo(null);
    }
  };

  return {
    siren,
    entrepriseInfo,
    loadingEntreprise,
    sirenError,
    searchEntreprise,
    handleSirenChange
  };
};


