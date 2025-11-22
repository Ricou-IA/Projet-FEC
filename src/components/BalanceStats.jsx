import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, BarChart3, Download, Calculator, Edit2, Save, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calculerSeuilsAudit, formatSeuil } from '../utils/seuilCalculator';

const BalanceStats = ({ 
  parseResult1, 
  parseResult2, 
  generateCompteResultat,
  generateBilan,
  onExportBalance 
}) => {
  const nEquilibre = parseResult1?.balance < 0.01;
  const n1Equilibre = parseResult2 ? parseResult2.balance < 0.01 : true;

  // États pour la saisie manuelle des seuils
  const [ssgN, setSsgN] = useState('');
  const [seuilRemonteeN, setSeuilRemonteeN] = useState('');
  const [ssgN1, setSsgN1] = useState('');
  const [seuilRemonteeN1, setSeuilRemonteeN1] = useState('');
  const [isEditingN, setIsEditingN] = useState(false);
  const [isEditingN1, setIsEditingN1] = useState(false);

  // Calcul des indicateurs d'audit pour l'exercice N
  const indicateursAuditN = useMemo(() => {
    if (!parseResult1 || !generateCompteResultat || !generateBilan) {
      return null;
    }

    try {
      const compteResultat = generateCompteResultat(parseResult1);
      const bilan = generateBilan(parseResult1);

      // Récupérer le Chiffre d'Affaires depuis le compte de résultat
      const chiffreAffaires = compteResultat?.chiffreAffaires || 0;

      // Récupérer le Total Bilan (actif ou passif, ils sont égaux)
      let totalBilan = 0;
      if (bilan?.actif?.total) {
        totalBilan = bilan.actif.total;
      } else if (bilan?.passif?.total) {
        totalBilan = bilan.passif.total;
      } else if (bilan?.equilibre?.totalActif) {
        totalBilan = bilan.equilibre.totalActif;
      } else if (bilan?.equilibre?.totalPassif) {
        totalBilan = bilan.equilibre.totalPassif;
      } else if (bilan?.equilibre?.totalActif) {
        totalBilan = bilan.equilibre.totalActif;
      } else if (bilan?.equilibre?.totalPassif) {
        totalBilan = bilan.equilibre.totalPassif;
      }

      // Calculer les seuils
      return calculerSeuilsAudit(chiffreAffaires, totalBilan);
    } catch (error) {
      console.error('Erreur lors du calcul des indicateurs d\'audit:', error);
      return null;
    }
  }, [parseResult1, generateCompteResultat, generateBilan]);

  // Calcul des indicateurs d'audit pour l'exercice N-1
  const indicateursAuditN1 = useMemo(() => {
    if (!parseResult2 || !generateCompteResultat || !generateBilan) {
      return null;
    }

    try {
      const compteResultat = generateCompteResultat(parseResult2);
      const bilan = generateBilan(parseResult2);

      const chiffreAffaires = compteResultat?.chiffreAffaires || 0;

      let totalBilan = 0;
      if (bilan?.actif?.total) {
        totalBilan = bilan.actif.total;
      } else if (bilan?.passif?.total) {
        totalBilan = bilan.passif.total;
      } else if (bilan?.equilibre?.totalActif) {
        totalBilan = bilan.equilibre.totalActif;
      } else if (bilan?.equilibre?.totalPassif) {
        totalBilan = bilan.equilibre.totalPassif;
      }

      return calculerSeuilsAudit(chiffreAffaires, totalBilan);
    } catch (error) {
      console.error('Erreur lors du calcul des indicateurs d\'audit N-1:', error);
      return null;
    }
  }, [parseResult2, generateCompteResultat, generateBilan]);

  // Initialiser les valeurs manuelles avec les valeurs calculées
  useEffect(() => {
    if (indicateursAuditN && !ssgN && !seuilRemonteeN) {
      setSsgN(indicateursAuditN.ssg.toString());
      setSeuilRemonteeN(indicateursAuditN.seuilRemontee.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicateursAuditN]);

  useEffect(() => {
    if (indicateursAuditN1 && !ssgN1 && !seuilRemonteeN1) {
      setSsgN1(indicateursAuditN1.ssg.toString());
      setSeuilRemonteeN1(indicateursAuditN1.seuilRemontee.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicateursAuditN1]);

  // Fonction pour parser un montant depuis une chaîne
  const parseMontant = (value) => {
    if (!value) return 0;
    // Supprimer les espaces et remplacer la virgule par un point
    const cleaned = value.toString().replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Fonction pour formater un montant pour l'input
  const formatMontantInput = (value) => {
    if (!value) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Fonction pour sauvegarder les valeurs manuelles (Exercice N)
  const handleSaveN = () => {
    const ssgValue = parseMontant(ssgN);
    const seuilValue = parseMontant(seuilRemonteeN);
    
    if (ssgValue > 0) {
      setSsgN(ssgValue.toString());
    }
    if (seuilValue > 0) {
      setSeuilRemonteeN(seuilValue.toString());
    }
    setIsEditingN(false);
  };

  // Fonction pour sauvegarder les valeurs manuelles (Exercice N-1)
  const handleSaveN1 = () => {
    const ssgValue = parseMontant(ssgN1);
    const seuilValue = parseMontant(seuilRemonteeN1);
    
    if (ssgValue > 0) {
      setSsgN1(ssgValue.toString());
    }
    if (seuilValue > 0) {
      setSeuilRemonteeN1(seuilValue.toString());
    }
    setIsEditingN1(false);
  };

  // Fonction pour réinitialiser aux valeurs calculées (Exercice N)
  const handleResetN = () => {
    if (indicateursAuditN) {
      setSsgN(indicateursAuditN.ssg.toString());
      setSeuilRemonteeN(indicateursAuditN.seuilRemontee.toString());
    }
    setIsEditingN(false);
  };

  // Fonction pour réinitialiser aux valeurs calculées (Exercice N-1)
  const handleResetN1 = () => {
    if (indicateursAuditN1) {
      setSsgN1(indicateursAuditN1.ssg.toString());
      setSeuilRemonteeN1(indicateursAuditN1.seuilRemontee.toString());
    }
    setIsEditingN1(false);
  };

  // Valeurs finales à afficher (manuelles si saisies, sinon calculées)
  const ssgFinalN = ssgN ? parseMontant(ssgN) : (indicateursAuditN?.ssg || 0);
  const seuilRemonteeFinalN = seuilRemonteeN ? parseMontant(seuilRemonteeN) : (indicateursAuditN?.seuilRemontee || 0);
  const ssgFinalN1 = ssgN1 ? parseMontant(ssgN1) : (indicateursAuditN1?.ssg || 0);
  const seuilRemonteeFinalN1 = seuilRemonteeN1 ? parseMontant(seuilRemonteeN1) : (indicateursAuditN1?.seuilRemontee || 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="text-green-500" size={24} />
        <h2 className="text-xl font-semibold text-gray-800">
          Traitement réussi !
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance comptable - Colonne de gauche */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">
                Balance comptable
              </h3>
            </div>
            <button
              onClick={onExportBalance}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Exporter la balance comptable au format Excel"
            >
              <Download size={16} />
              Exporter (XLS)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne Exercice N */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Exercice N
                <br />
                <span className="font-normal">Période du {formatDate(parseResult1?.minDate)} au {formatDate(parseResult1?.maxDate)}</span>
              </h4>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium mb-1">
                    Nombre d'écritures
                  </p>
                  <p className="text-xl font-bold text-green-900">
                    {parseResult1?.rowsCount?.toLocaleString('fr-FR')}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium mb-1">
                    Total Débit
                  </p>
                  <p className="text-xl font-bold text-blue-900">
                    {formatCurrency(parseResult1?.totalDebit)}
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium mb-1">
                    Total Crédit
                  </p>
                  <p className="text-xl font-bold text-orange-900">
                    {formatCurrency(parseResult1?.totalCredit)}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium mb-1">
                    Différence
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(parseResult1?.balance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Colonne Exercice N-1 */}
            {parseResult2 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Exercice N-1
                  <br />
                  <span className="font-normal">Période du {formatDate(parseResult2?.minDate)} au {formatDate(parseResult2?.maxDate)}</span>
                </h4>
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium mb-1">
                      Nombre d'écritures
                    </p>
                    <p className="text-xl font-bold text-green-900">
                      {parseResult2?.rowsCount?.toLocaleString('fr-FR')}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium mb-1">
                      Total Débit
                    </p>
                    <p className="text-xl font-bold text-blue-900">
                      {formatCurrency(parseResult2.totalDebit)}
                    </p>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600 font-medium mb-1">
                      Total Crédit
                    </p>
                    <p className="text-xl font-bold text-orange-900">
                      {formatCurrency(parseResult2.totalCredit)}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Différence
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(parseResult2.balance)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Message global d'équilibre */}
          {nEquilibre && n1Equilibre ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded border border-green-200 mt-4">
              <CheckCircle className="text-green-600" size={20} />
              <p className="text-sm text-green-700 font-medium">
                Les balances sont équilibrées
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded border border-yellow-200 mt-4">
              <AlertCircle className="text-yellow-600" size={20} />
              <p className="text-sm text-yellow-700 font-medium">
                Attention: la balance n'est pas équilibrée pour {
                  [].concat(
                    !nEquilibre ? 'Exercice N' : [],
                    parseResult2 && !n1Equilibre ? 'Exercice N-1' : []
                  ).join(' et ')
                }
              </p>
            </div>
          )}
        </div>

        {/* Indicateurs d'audit - Colonne de droite */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="text-purple-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-800">
              Indicateurs d'audit
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Exercice N */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Exercice N
                <br />
                <span className="font-normal">Période du {formatDate(parseResult1?.minDate)} au {formatDate(parseResult1?.maxDate)}</span>
              </h4>
              {indicateursAuditN ? (
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-purple-600 font-medium">
                        Seuil de Signification (SSG)
                      </p>
                      {!isEditingN ? (
                        <button
                          onClick={() => setIsEditingN(true)}
                          className="text-purple-600 hover:text-purple-800 transition-colors"
                          title="Modifier manuellement"
                        >
                          <Edit2 size={16} />
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={handleSaveN}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Enregistrer"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={handleResetN}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Réinitialiser"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditingN ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={formatMontantInput(ssgN)}
                          onChange={(e) => setSsgN(e.target.value.replace(/\s/g, ''))}
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg text-xl font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0"
                        />
                        <p className="text-xs text-purple-500">
                          Valeur calculée: {formatSeuil(indicateursAuditN.ssg)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-purple-900">
                        {formatSeuil(ssgFinalN)}
                      </p>
                    )}
                    <p className="text-xs text-purple-500 mt-1">
                      Base: {formatCurrency(indicateursAuditN.baseReference)}
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-indigo-600 font-medium">
                        Seuil de remontée des anomalies
                      </p>
                      {!isEditingN ? (
                        <button
                          onClick={() => setIsEditingN(true)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors"
                          title="Modifier manuellement"
                        >
                          <Edit2 size={16} />
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={handleSaveN}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Enregistrer"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={handleResetN}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Réinitialiser"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditingN ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={formatMontantInput(seuilRemonteeN)}
                          onChange={(e) => setSeuilRemonteeN(e.target.value.replace(/\s/g, ''))}
                          className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-xl font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                        <p className="text-xs text-indigo-500">
                          Valeur calculée: {formatSeuil(indicateursAuditN.seuilRemontee)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-indigo-900">
                        {formatSeuil(seuilRemonteeFinalN)}
                      </p>
                    )}
                    <p className="text-xs text-indigo-500 mt-1">
                      (3% du SSG)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
                  Données non disponibles
                </div>
              )}
            </div>

            {/* Exercice N-1 */}
            {parseResult2 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Exercice N-1
                  <br />
                  <span className="font-normal">Période du {formatDate(parseResult2?.minDate)} au {formatDate(parseResult2?.maxDate)}</span>
                </h4>
                {indicateursAuditN1 ? (
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-purple-600 font-medium">
                          Seuil de Signification (SSG)
                        </p>
                        {!isEditingN1 ? (
                          <button
                            onClick={() => setIsEditingN1(true)}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="Modifier manuellement"
                          >
                            <Edit2 size={16} />
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={handleSaveN1}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Enregistrer"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={handleResetN1}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Réinitialiser"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditingN1 ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={formatMontantInput(ssgN1)}
                            onChange={(e) => setSsgN1(e.target.value.replace(/\s/g, ''))}
                            className="w-full px-3 py-2 border border-purple-300 rounded-lg text-xl font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="0"
                          />
                          <p className="text-xs text-purple-500">
                            Valeur calculée: {formatSeuil(indicateursAuditN1.ssg)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xl font-bold text-purple-900">
                          {formatSeuil(ssgFinalN1)}
                        </p>
                      )}
                      <p className="text-xs text-purple-500 mt-1">
                        Base: {formatCurrency(indicateursAuditN1.baseReference)}
                      </p>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-indigo-600 font-medium">
                          Seuil de remontée des anomalies
                        </p>
                        {!isEditingN1 ? (
                          <button
                            onClick={() => setIsEditingN1(true)}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors"
                            title="Modifier manuellement"
                          >
                            <Edit2 size={16} />
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={handleSaveN1}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Enregistrer"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={handleResetN1}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Réinitialiser"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditingN1 ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={formatMontantInput(seuilRemonteeN1)}
                            onChange={(e) => setSeuilRemonteeN1(e.target.value.replace(/\s/g, ''))}
                            className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-xl font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                          />
                          <p className="text-xs text-indigo-500">
                            Valeur calculée: {formatSeuil(indicateursAuditN1.seuilRemontee)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xl font-bold text-indigo-900">
                          {formatSeuil(seuilRemonteeFinalN1)}
                        </p>
                      )}
                      <p className="text-xs text-indigo-500 mt-1">
                        (3% du SSG)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
                    Données non disponibles
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceStats;


