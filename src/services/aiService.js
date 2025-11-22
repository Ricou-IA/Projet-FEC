// Récupération de la clé API depuis les variables d'environnement ou depuis le localStorage
const getDefaultApiKey = () => {
  // Priorité 1: localStorage (saisie utilisateur)
  const storedKey = localStorage.getItem('openrouter_api_key');
  if (storedKey) return storedKey;
  
  // Priorité 2: variable d'environnement (pour développement)
  const envKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (envKey && envKey !== 'undefined') return envKey;
  
  return null;
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Modèles par défaut pour chaque type d'usage
const DEFAULT_MODELS = {
  analyze: 'openai/gpt-4o-mini',
  question: 'openai/gpt-4o-mini',
  anomalies: 'openai/gpt-4o',
  report: 'openai/gpt-4o',
  programme: 'anthropic/claude-3.5-sonnet' // Claude 3.5 Sonnet pour le programme de travail structuré
};

// Charger le programme de travail CNCC/NEP
let programmeTravailCNCC = null;
const loadProgrammeTravailCNCC = async () => {
  if (programmeTravailCNCC) return programmeTravailCNCC;
  
  try {
    // Avec Vite, on peut importer directement un JSON comme module ES6
    const module = await import('../data/programmeTravailCNCC.json');
    programmeTravailCNCC = module.default || module;
    return programmeTravailCNCC;
  } catch (error) {
    console.error('Erreur lors du chargement du programme de travail CNCC:', error);
    return null;
  }
};

export class AIService {
  /**
   * Analyse les données FEC et génère des insights
   */
  static async analyzeFECData(context, model = null) {
    const prompt = this.buildAnalysisPrompt(context);
    const modelToUse = model || this.getModelForUsage('analyze');
    return this.callOpenRouter(prompt, modelToUse);
  }

  /**
   * Répond à une question de l'utilisateur sur les données
   */
  static async answerQuestion(question, context, model = null) {
    const prompt = this.buildQuestionPrompt(question, context);
    const modelToUse = model || this.getModelForUsage('question');
    return this.callOpenRouter(prompt, modelToUse);
  }

  /**
   * Détecte les anomalies comptables
   */
  static async detectAnomalies(context, model = null) {
    const prompt = this.buildAnomalyDetectionPrompt(context);
    const modelToUse = model || this.getModelForUsage('anomalies');
    return this.callOpenRouter(prompt, modelToUse);
  }

  /**
   * Génère un rapport d'analyse complet
   */
  static async generateReport(context, model = null) {
    const prompt = this.buildReportPrompt(context);
    const modelToUse = model || this.getModelForUsage('report');
    return this.callOpenRouter(prompt, modelToUse);
  }

  /**
   * Génère un programme de travail basé sur les règles comptables et les données FEC
   */
  static async generateProgrammeTravail(context, model = null) {
    const prompt = await this.buildProgrammeTravailPrompt(context);
    const modelToUse = model || this.getModelForUsage('programme');
    console.log(`[Programme de travail] Utilisation du modèle: ${modelToUse}`);
    return this.callOpenRouter(prompt, modelToUse);
  }

  /**
   * Définir la clé API OpenRouter (stockée dans localStorage)
   */
  static setApiKey(apiKey) {
    if (apiKey && apiKey.trim()) {
      localStorage.setItem('openrouter_api_key', apiKey.trim());
      return true;
    }
    return false;
  }

  /**
   * Récupérer la clé API actuelle
   */
  static getApiKey() {
    return getDefaultApiKey();
  }

  /**
   * Supprimer la clé API
   */
  static clearApiKey() {
    localStorage.removeItem('openrouter_api_key');
  }

  /**
   * Définir le modèle pour un type d'usage
   */
  static setModelForUsage(usage, model) {
    if (usage && model) {
      const key = `openrouter_model_${usage}`;
      localStorage.setItem(key, model);
      return true;
    }
    return false;
  }

  /**
   * Récupérer le modèle pour un type d'usage
   */
  static getModelForUsage(usage) {
    const key = `openrouter_model_${usage}`;
    const stored = localStorage.getItem(key);
    return stored || DEFAULT_MODELS[usage] || DEFAULT_MODELS.analyze;
  }

  /**
   * Appel à l'API OpenRouter
   */
  static async callOpenRouter(prompt, model = 'openai/gpt-4o-mini') {
    const apiKey = getDefaultApiKey();
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Clé API OpenRouter non configurée. Veuillez saisir votre clé API dans les paramètres.');
    }

    try {
      // Log du modèle utilisé pour le débogage
      if (model.includes('claude')) {
        console.log(`[OpenRouter] Appel avec Claude: ${model}`);
      }
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin, // Optionnel mais recommandé par OpenRouter
          'X-Title': 'Assistant IA Comptable' // Optionnel mais recommandé
        },
        body: JSON.stringify({
          model: model, // Le modèle est transmis à OpenRouter (ex: 'anthropic/claude-3.5-sonnet')
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert-comptable français spécialisé dans l\'analyse de fichiers FEC (Fichier des Écritures Comptables). Tu analyses les données comptables selon le Plan Comptable Général français et les normes CNCC. Tu réponds toujours en français de manière professionnelle, structurée et précise.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || `Erreur API OpenRouter: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Réponse API invalide');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      if (error.message.includes('API') || error.message.includes('Clé API')) {
        throw error;
      }
      throw new Error(`Erreur lors de l'appel à l'API OpenRouter: ${error.message}`);
    }
  }

  /**
   * Construit le prompt pour l'analyse automatique
   */
  static buildAnalysisPrompt(context) {
    const { parseResult, cyclesResult, compteResultat, bilan, sig, entrepriseInfo } = context;
    
    let prompt = `Analyse les données comptables suivantes et fournis des insights pertinents :\n\n`;
    
    if (entrepriseInfo) {
      prompt += `**Entreprise :** ${entrepriseInfo.nom}\n`;
      prompt += `SIREN: ${entrepriseInfo.siren}\n`;
      if (entrepriseInfo.codeNaf) {
        prompt += `Code NAF: ${entrepriseInfo.codeNaf} - ${entrepriseInfo.libelleNaf || ''}\n`;
      }
      if (entrepriseInfo.formeJuridique) {
        prompt += `Forme juridique: ${entrepriseInfo.formeJuridique}\n`;
      }
      prompt += `\n`;
    }

    if (parseResult) {
      prompt += `**Période :** ${parseResult.minDate} au ${parseResult.maxDate}\n`;
      prompt += `**Nombre d'écritures :** ${parseResult.rowsCount.toLocaleString('fr-FR')}\n`;
      prompt += `**Total Débit :** ${parseResult.totalDebit.toLocaleString('fr-FR')} €\n`;
      prompt += `**Total Crédit :** ${parseResult.totalCredit.toLocaleString('fr-FR')} €\n`;
      prompt += `**Balance :** ${parseResult.balance.toLocaleString('fr-FR')} €\n`;
      if (Math.abs(parseResult.balance) > 0.01) {
        prompt += `⚠️ ALERTE: La balance n'est pas équilibrée !\n`;
      }
      prompt += `\n`;
    }

    if (cyclesResult && cyclesResult.statsParCycle) {
      prompt += `**Répartition par cycles (top 5) :**\n`;
      Object.entries(cyclesResult.statsParCycle)
        .filter(([, stats]) => stats.nbEcritures > 0)
        .sort(([, a], [, b]) => b.nbEcritures - a.nbEcritures)
        .slice(0, 5)
        .forEach(([code, stats]) => {
          prompt += `- ${stats.nom}: ${stats.nbEcritures.toLocaleString('fr-FR')} écritures (${stats.pourcentageEcritures.toFixed(1)}%), Solde: ${stats.solde.toLocaleString('fr-FR')} €\n`;
        });
      prompt += `\n`;
    }

    if (sig) {
      prompt += `**Soldes Intermédiaires de Gestion :**\n`;
      prompt += `- Marge commerciale: ${sig.margeCommerciale.toLocaleString('fr-FR')} €\n`;
      prompt += `- Production de l'exercice: ${sig.productionExercice.toLocaleString('fr-FR')} €\n`;
      prompt += `- Valeur ajoutée: ${sig.valeurAjoutee.toLocaleString('fr-FR')} €\n`;
      prompt += `- EBE (Excédent Brut d'Exploitation): ${sig.ebe.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat d'exploitation: ${sig.resultatExploitation.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat courant avant impôt: ${sig.resultatCourantAvantImpot.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat exceptionnel: ${sig.resultatExceptionnel.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat net: ${sig.resultatNet.toLocaleString('fr-FR')} €\n\n`;
      
      // Alertes SIG
      if (sig.ebe < 0) {
        prompt += `⚠️ ALERTE: EBE négatif (${sig.ebe.toLocaleString('fr-FR')} €)\n`;
      }
      if (sig.resultatNet < 0) {
        prompt += `⚠️ ALERTE: Résultat net négatif (perte de ${Math.abs(sig.resultatNet).toLocaleString('fr-FR')} €)\n`;
      }
      prompt += `\n`;
    }

    if (compteResultat) {
      const totalCharges = compteResultat.charges.reduce((sum, item) => sum + item.solde, 0);
      const totalProduits = compteResultat.produits.reduce((sum, item) => sum + item.solde, 0);
      prompt += `**Compte de Résultat :**\n`;
      prompt += `- Total Charges: ${totalCharges.toLocaleString('fr-FR')} €\n`;
      prompt += `- Total Produits: ${totalProduits.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat: ${(totalProduits - totalCharges).toLocaleString('fr-FR')} €\n\n`;
    }

    if (bilan) {
      const totalActif = bilan.actif.reduce((sum, item) => sum + item.solde, 0);
      const totalPassif = bilan.passif.reduce((sum, item) => sum + item.solde, 0);
      prompt += `**Bilan :**\n`;
      prompt += `- Total Actif: ${totalActif.toLocaleString('fr-FR')} €\n`;
      prompt += `- Total Passif: ${totalPassif.toLocaleString('fr-FR')} €\n`;
      const ecart = Math.abs(totalActif - totalPassif);
      if (ecart > 0.01) {
        prompt += `⚠️ ALERTE: Écart entre Actif et Passif de ${ecart.toLocaleString('fr-FR')} €\n`;
      }
      prompt += `\n`;
    }

    prompt += `**Demande :** Analyse ces données et fournis :\n`;
    prompt += `1. Un résumé de la situation financière (2-3 phrases)\n`;
    prompt += `2. Les points forts identifiés (liste à puces)\n`;
    prompt += `3. Les points d'attention ou faiblesses (liste à puces)\n`;
    prompt += `4. Des recommandations d'amélioration concrètes (liste à puces)\n`;
    prompt += `5. Des alertes sur d'éventuelles anomalies détectées\n\n`;
    prompt += `Réponds de manière structurée, professionnelle et concise. Utilise des émojis pour les sections si approprié.`;

    return prompt;
  }

  /**
   * Construit le prompt pour une question utilisateur
   */
  static buildQuestionPrompt(question, context) {
    let prompt = `**Contexte comptable :**\n\n`;
    
    if (context.entrepriseInfo) {
      prompt += `Entreprise: ${context.entrepriseInfo.nom} (SIREN: ${context.entrepriseInfo.siren})\n`;
      if (context.entrepriseInfo.codeNaf) {
        prompt += `Activité: ${context.entrepriseInfo.libelleNaf}\n`;
      }
    }
    
    if (context.parseResult) {
      prompt += `Période analysée: ${context.parseResult.minDate} au ${context.parseResult.maxDate}\n`;
      prompt += `Nombre d'écritures: ${context.parseResult.rowsCount.toLocaleString('fr-FR')}\n`;
    }

    if (context.sig) {
      prompt += `\n**Indicateurs clés :**\n`;
      prompt += `- EBE: ${context.sig.ebe.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat d'exploitation: ${context.sig.resultatExploitation.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat net: ${context.sig.resultatNet.toLocaleString('fr-FR')} €\n`;
    }

    if (context.cyclesResult && context.cyclesResult.statsParCycle) {
      const topCycles = Object.entries(context.cyclesResult.statsParCycle)
        .filter(([, stats]) => stats.nbEcritures > 0)
        .sort(([, a], [, b]) => b.nbEcritures - a.nbEcritures)
        .slice(0, 3)
        .map(([, stats]) => `${stats.nom} (${stats.nbEcritures} écritures)`)
        .join(', ');
      if (topCycles) {
        prompt += `\nCycles principaux: ${topCycles}\n`;
      }
    }

    prompt += `\n**Question de l'utilisateur :** ${question}\n\n`;
    prompt += `Réponds de manière précise, professionnelle et en te basant uniquement sur les données disponibles. Si tu n'as pas assez d'informations, dis-le clairement.`;

    return prompt;
  }

  /**
   * Construit le prompt pour la détection d'anomalies
   */
  static buildAnomalyDetectionPrompt(context) {
    let prompt = `Analyse approfondie des données comptables pour détecter des anomalies, incohérences ou points d'attention :\n\n`;
    
    if (context.parseResult) {
      prompt += `**Balance comptable :**\n`;
      prompt += `- Total Débit: ${context.parseResult.totalDebit.toLocaleString('fr-FR')} €\n`;
      prompt += `- Total Crédit: ${context.parseResult.totalCredit.toLocaleString('fr-FR')} €\n`;
      prompt += `- Écart: ${context.parseResult.balance.toLocaleString('fr-FR')} €\n`;
      if (Math.abs(context.parseResult.balance) > 0.01) {
        prompt += `⚠️ ALERTE CRITIQUE: La balance n'est pas équilibrée !\n`;
      }
      prompt += `\n`;
    }

    if (context.sig) {
      prompt += `**Analyse des SIG :**\n`;
      prompt += `- Marge commerciale: ${context.sig.margeCommerciale.toLocaleString('fr-FR')} €\n`;
      prompt += `- Production: ${context.sig.productionExercice.toLocaleString('fr-FR')} €\n`;
      prompt += `- Valeur ajoutée: ${context.sig.valeurAjoutee.toLocaleString('fr-FR')} €\n`;
      prompt += `- EBE: ${context.sig.ebe.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat net: ${context.sig.resultatNet.toLocaleString('fr-FR')} €\n\n`;
      
      // Détection d'anomalies
      const anomalies = [];
      if (context.sig.ebe < 0) {
        anomalies.push(`EBE négatif (${context.sig.ebe.toLocaleString('fr-FR')} €) - L'entreprise ne génère pas assez de valeur ajoutée`);
      }
      if (context.sig.resultatNet < 0) {
        anomalies.push(`Résultat net négatif (perte de ${Math.abs(context.sig.resultatNet).toLocaleString('fr-FR')} €)`);
      }
      if (context.sig.valeurAjoutee < 0) {
        anomalies.push(`Valeur ajoutée négative - Problème structurel`);
      }
      if (context.sig.resultatFinancier < -10000) {
        anomalies.push(`Charges financières élevées (${Math.abs(context.sig.resultatFinancier).toLocaleString('fr-FR')} €)`);
      }
      
      if (anomalies.length > 0) {
        prompt += `⚠️ Anomalies détectées :\n`;
        anomalies.forEach(a => prompt += `- ${a}\n`);
        prompt += `\n`;
      }
    }

    if (context.bilan) {
      const totalActif = context.bilan.actif.reduce((sum, item) => sum + item.solde, 0);
      const totalPassif = context.bilan.passif.reduce((sum, item) => sum + item.solde, 0);
      const ecart = Math.abs(totalActif - totalPassif);
      
      prompt += `**Bilan :**\n`;
      prompt += `- Total Actif: ${totalActif.toLocaleString('fr-FR')} €\n`;
      prompt += `- Total Passif: ${totalPassif.toLocaleString('fr-FR')} €\n`;
      if (ecart > 0.01) {
        prompt += `⚠️ ALERTE: Écart de ${ecart.toLocaleString('fr-FR')} € entre Actif et Passif\n`;
      }
      prompt += `\n`;
    }

    prompt += `**Demande :** Identifie TOUTES les anomalies, incohérences, ratios anormaux ou points d'attention dans ces données comptables.`;
    prompt += ` Pour chaque anomalie, explique :\n`;
    prompt += `1. La nature du problème\n`;
    prompt += `2. Sa gravité (critique, importante, mineure)\n`;
    prompt += `3. Les causes possibles\n`;
    prompt += `4. Les recommandations pour corriger\n\n`;
    prompt += `Réponds de manière structurée avec des sections claires.`;

    return prompt;
  }

  /**
   * Construit le prompt pour le programme de travail selon les normes CNCC/NEP
   */
  static async buildProgrammeTravailPrompt(context) {
    // Charger le JSON du programme de travail CNCC/NEP
    const programmeTravailJSON = await loadProgrammeTravailCNCC();

    let prompt = `Tu es un Expert en Audit Légal et Assistant Commissaire aux Comptes (CAC), spécialisé dans les Normes d'Exercice Professionnel (NEP) homologuées par la CNCC en France. Ton rôle est de générer des programmes de travail d'audit hautement structurés et conformes.\n\n`;
    
    prompt += `### Instruction Principale\n\n`;
    prompt += `**Ton objectif est de convertir le Programme de Travail générique fourni ci-dessous (au format JSON) en un tableau d'actions détaillées et spécifiques, adapté à l'analyse des comptes d'une entité.**\n\n`;
    prompt += `Tu dois suivre scrupuleusement la structure fournie dans le JSON pour garantir la conformité aux NEP.\n\n`;
    
    prompt += `### Données d'Entrée (Programme de Travail CNCC/NEP)\n\n`;
    
    // Ajouter le JSON du programme de travail
    if (programmeTravailJSON) {
      prompt += `**PROGRAMME DE TRAVAIL GÉNÉRIQUE (JSON) :**\n\n`;
      prompt += `\`\`\`json\n`;
      prompt += JSON.stringify(programmeTravailJSON, null, 2);
      prompt += `\n\`\`\`\n\n`;
      prompt += `(Note: Vous devez utiliser l'intégralité du contenu JSON ci-dessus comme source de vérité pour les phases et les exigences réglementaires.)\n\n`;
    }
    
    prompt += `**CONTEXTE DE LA MISSION D'AUDIT :**\n\n`;
    
    if (context.parseResult) {
      prompt += `**EXERCICE N (ACTUEL) :**\n`;
      prompt += `- Période analysée : ${context.parseResult.minDate ? context.parseResult.minDate.toLocaleDateString('fr-FR') : 'N/A'} au ${context.parseResult.maxDate ? context.parseResult.maxDate.toLocaleDateString('fr-FR') : 'N/A'}\n`;
      prompt += `- Nombre d'écritures : ${context.parseResult.rowsCount.toLocaleString('fr-FR')}\n`;
      prompt += `- Total Débit : ${context.parseResult.totalDebit.toLocaleString('fr-FR')} €\n`;
      prompt += `- Total Crédit : ${context.parseResult.totalCredit.toLocaleString('fr-FR')} €\n`;
      if (Math.abs(context.parseResult.balance) > 0.01) {
        prompt += `⚠️ **ALERTE :** Balance déséquilibrée (écart de ${context.parseResult.balance.toLocaleString('fr-FR')} €)\n`;
      }
      prompt += `\n`;
    }

    if (context.parseResult2) {
      prompt += `**EXERCICE N-1 (PRÉCÉDENT) :**\n`;
      prompt += `- Période analysée : ${context.parseResult2.minDate ? context.parseResult2.minDate.toLocaleDateString('fr-FR') : 'N/A'} au ${context.parseResult2.maxDate ? context.parseResult2.maxDate.toLocaleDateString('fr-FR') : 'N/A'}\n`;
      prompt += `- Nombre d'écritures : ${context.parseResult2.rowsCount.toLocaleString('fr-FR')}\n`;
      prompt += `- Total Débit : ${context.parseResult2.totalDebit.toLocaleString('fr-FR')} €\n`;
      prompt += `- Total Crédit : ${context.parseResult2.totalCredit.toLocaleString('fr-FR')} €\n`;
      if (Math.abs(context.parseResult2.balance) > 0.01) {
        prompt += `⚠️ **ALERTE :** Balance déséquilibrée (écart de ${context.parseResult2.balance.toLocaleString('fr-FR')} €)\n`;
      }
      prompt += `\n`;
      prompt += `**COMPARAISON N vs N-1 :**\n`;
      const evolutionEcritures = context.parseResult2.rowsCount > 0 ? ((context.parseResult.rowsCount - context.parseResult2.rowsCount) / context.parseResult2.rowsCount * 100).toFixed(1) : 'N/A';
      const evolutionDebit = context.parseResult2.totalDebit > 0 ? ((context.parseResult.totalDebit - context.parseResult2.totalDebit) / context.parseResult2.totalDebit * 100).toFixed(1) : 'N/A';
      prompt += `- Évolution écritures : ${evolutionEcritures}%\n`;
      prompt += `- Évolution débit : ${evolutionDebit}%\n`;
      prompt += `\n`;
    }

    if (context.entrepriseInfo) {
      prompt += `**INFORMATIONS ENTREPRISE :**\n`;
      prompt += `- Raison sociale : ${context.entrepriseInfo.denomination || 'N/A'}\n`;
      prompt += `- SIREN : ${context.entrepriseInfo.siren || 'N/A'}\n`;
      prompt += `- Code NAF : ${context.entrepriseInfo.naf || 'N/A'}\n`;
      if (context.entrepriseInfo.naf_label) {
        prompt += `- Activité : ${context.entrepriseInfo.naf_label}\n`;
      }
      prompt += `\n`;
    }

    if (context.cyclesResult && context.cyclesResult.statsParCycle) {
      prompt += `**RÉPARTITION PAR CYCLES COMPTABLES (DONNÉES FEC) :**\n`;
      prompt += `IMPORTANT : Ces cycles ont été identifiés dans le FEC analysé. Tu DOIS adapter le programme de travail pour inclure des contrôles spécifiques pour chaque cycle significatif.\n\n`;
      
      const cycles = Object.entries(context.cyclesResult.statsParCycle)
        .filter(([, stats]) => stats.nbEcritures > 0)
        .sort(([, a], [, b]) => b.nbEcritures - a.nbEcritures);
      
      cycles.forEach(([code, stats]) => {
        prompt += `**Cycle: ${stats.nom}**\n`;
        prompt += `- Nombre d'écritures : ${stats.nbEcritures.toLocaleString('fr-FR')} (${stats.pourcentageEcritures.toFixed(1)}% du total)\n`;
        prompt += `- Total Débit : ${stats.totalDebit.toLocaleString('fr-FR')} €\n`;
        prompt += `- Total Crédit : ${stats.totalCredit.toLocaleString('fr-FR')} €\n`;
        prompt += `- Solde : ${(stats.solde >= 0 ? '+' : '')}${stats.solde.toLocaleString('fr-FR')} €\n`;
        prompt += `- Comptes uniques : ${stats.comptesUniques}\n`;
        prompt += `- Journaux utilisés : ${stats.journauxUniques}\n`;
        prompt += `- Description : ${stats.description}\n\n`;
      });
      
      prompt += `**INSTRUCTION CRITIQUE :**\n`;
      prompt += `Pour chaque cycle identifié ci-dessus, tu DOIS créer des tâches spécifiques dans le programme de travail (Phase P3) qui incluent :\n`;
      prompt += `1. Des procédures de contrôle adaptées au cycle (ex: pour le cycle Ventes/Clients, contrôler les factures, les relances, les créances)\n`;
      prompt += `2. Des tests de détail sur les comptes les plus significatifs de ce cycle\n`;
      prompt += `3. Des procédures analytiques spécifiques (ratios, comparaisons) pour ce cycle\n`;
      prompt += `4. Des points de vigilance particuliers liés à ce cycle\n\n`;
      prompt += `Les cycles avec le plus grand nombre d'écritures ou les soldes les plus importants doivent avoir des contrôles plus approfondis.\n\n`;
    }

    if (context.sig) {
      prompt += `**SOLDES INTERMÉDIAIRES DE GESTION (EXERCICE N) :**\n`;
      prompt += `- Marge commerciale : ${context.sig.margeCommerciale.toLocaleString('fr-FR')} €\n`;
      prompt += `- Production de l'exercice : ${context.sig.productionExercice.toLocaleString('fr-FR')} €\n`;
      prompt += `- Valeur ajoutée : ${context.sig.valeurAjoutee.toLocaleString('fr-FR')} €\n`;
      prompt += `- EBE : ${context.sig.ebe.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat d'exploitation : ${context.sig.resultatExploitation.toLocaleString('fr-FR')} €\n`;
      prompt += `- Résultat net : ${context.sig.resultatNet.toLocaleString('fr-FR')} €\n\n`;
      
      if (context.sig2) {
        prompt += `**SOLDES INTERMÉDIAIRES DE GESTION (EXERCICE N-1) :**\n`;
        prompt += `- Marge commerciale : ${context.sig2.margeCommerciale.toLocaleString('fr-FR')} €\n`;
        prompt += `- Production de l'exercice : ${context.sig2.productionExercice.toLocaleString('fr-FR')} €\n`;
        prompt += `- Valeur ajoutée : ${context.sig2.valeurAjoutee.toLocaleString('fr-FR')} €\n`;
        prompt += `- EBE : ${context.sig2.ebe.toLocaleString('fr-FR')} €\n`;
        prompt += `- Résultat d'exploitation : ${context.sig2.resultatExploitation.toLocaleString('fr-FR')} €\n`;
        prompt += `- Résultat net : ${context.sig2.resultatNet.toLocaleString('fr-FR')} €\n\n`;
        prompt += `**ÉVOLUTION DES SIG (N vs N-1) :**\n`;
        const calcEvolution = (valN, valN1) => valN1 !== 0 ? ((valN - valN1) / Math.abs(valN1) * 100).toFixed(1) : 'N/A';
        prompt += `- Marge commerciale : ${calcEvolution(context.sig.margeCommerciale, context.sig2.margeCommerciale)}%\n`;
        prompt += `- Production : ${calcEvolution(context.sig.productionExercice, context.sig2.productionExercice)}%\n`;
        prompt += `- Valeur ajoutée : ${calcEvolution(context.sig.valeurAjoutee, context.sig2.valeurAjoutee)}%\n`;
        prompt += `- EBE : ${calcEvolution(context.sig.ebe, context.sig2.ebe)}%\n`;
        prompt += `- Résultat d'exploitation : ${calcEvolution(context.sig.resultatExploitation, context.sig2.resultatExploitation)}%\n`;
        prompt += `- Résultat net : ${calcEvolution(context.sig.resultatNet, context.sig2.resultatNet)}%\n\n`;
      }
    }

    prompt += `### Règles de Transformation et d'Élaboration\n\n`;
    prompt += `1. **Cadre Immuable :** Tu ne dois jamais modifier les valeurs des champs \`Phase\`, \`Tâche\`, et \`Exigence(s) Réglementaire(s)\` du JSON original. Ces champs servent de base légale et normative à chaque ligne du programme.\n\n`;
    prompt += `2. **Détail Opérationnel :** Pour chaque enregistrement (chaque ligne) du JSON, tu dois transformer le champ générique \`Tâche\` en une **liste numérotée d'actions concrètes (2 à 4 étapes)** que l'auditeur doit réaliser sur le terrain. Ces actions doivent être spécifiques et orientées vers la pratique d'audit (ex: "Calculer le Seuil de Signification basé sur X% du Résultat Courant et Y% du Chiffre d'Affaires").\n\n`;
    prompt += `3. **Documentation Utilisateur :** Le champ \`Documentation Utilisateur\` doit être conservé tel quel. Il indique à l'utilisateur ce qu'il devra documenter pour respecter la NEP 230.\n\n`;
    prompt += `4. **Format de Sortie :** Le résultat final doit être présenté sous la forme d'un tableau en Markdown, sans les balises JSON, pour faciliter son intégration et son usage professionnel.\n\n`;
    
    prompt += `### Format de Sortie Exigé\n\n`;
    prompt += `Tu dois générer un JSON structuré (et uniquement du JSON, sans texte avant ou après) avec la structure suivante pour chaque tâche du programme :\n\n`;
    prompt += `\`\`\`json\n`;
    prompt += `[\n`;
    prompt += `  {\n`;
    prompt += `    "id": "unique_id",\n`;
    prompt += `    "phase": "P1: Acceptation et Planification Initiale",\n`;
    prompt += `    "tache": "Acquisition de la connaissance de l'entité...",\n`;
    prompt += `    "actionsOperatoires": [\n`;
    prompt += `      "1. Analyser le secteur d'activité et identifier les risques spécifiques",\n`;
    prompt += `      "2. Examiner le modèle économique et les processus clés",\n`;
    prompt += `      "3. Documenter les risques identifiés dans la matrice de risques"\n`;
    prompt += `    ],\n`;
    prompt += `    "exigenceReglementaire": "NEP 315 [1]",\n`;
    prompt += `    "documentationUtilisateur": "Synthèse de la connaissance acquise et du modèle d'affaires.",\n`;
    prompt += `    "statut": "a_faire",\n`;
    prompt += `    "dateRealisation": null,\n`;
    prompt += `    "notes": "",\n`;
    prompt += `    "realisePar": ""\n`;
    prompt += `  }\n`;
    prompt += `]\n`;
    prompt += `\`\`\`\n\n`;
    
    prompt += `**IMPORTANT :**\n`;
    prompt += `- Génère UNIQUEMENT le JSON, sans texte explicatif avant ou après\n`;
    prompt += `- Pour chaque ligne du JSON original, crée un objet avec les champs ci-dessus\n`;
    prompt += `- Les "actionsOperatoires" doivent être une liste de 2 à 4 actions concrètes et spécifiques\n`;
    prompt += `- **ADAPTATION AUX CYCLES FEC :** Pour la Phase P3 (Exécution des Procédures de Fond), tu DOIS créer des tâches supplémentaires spécifiques pour chaque cycle comptable identifié dans le FEC. Chaque cycle doit avoir au moins une tâche dédiée avec des actions opérationnelles adaptées aux comptes et aux montants de ce cycle.\n`;
    prompt += `- **PRIORISATION PAR IMPORTANCE :** Les cycles avec le plus grand nombre d'écritures ou les montants les plus élevés doivent avoir des contrôles plus approfondis (plus de tâches, plus d'actions par tâche).\n`;
    prompt += `- **DONNÉES SPÉCIFIQUES :** Utilise les montants réels (débits, crédits, soldes) et le nombre d'écritures de chaque cycle pour définir l'étendue des contrôles. Par exemple, si un cycle représente 40% des écritures, il doit avoir des contrôles proportionnellement plus importants.\n`;
    prompt += `- Adapte les actions opérationnelles en fonction des risques identifiés dans les données de l'entité\n`;
    prompt += `- Sois précis et actionnable dans les procédures proposées\n`;
    prompt += `- Respecte les normes professionnelles françaises (NEP CNCC)\n`;
    prompt += `- Utilise les informations contextuelles (période, cycles, SIG) pour personnaliser les actions\n`;
    prompt += `- Le champ "statut" doit être "a_faire" pour toutes les tâches initialement\n`;
    prompt += `- Génère un "id" unique pour chaque tâche (ex: "p1-t1", "p2-t3", "p3-cycle-ventes-t1")\n\n`;
    prompt += `**EXEMPLE DE TÂCHES PAR CYCLE :**\n`;
    prompt += `Pour le cycle "Ventes / Clients" avec X écritures et Y € de créances, crée une tâche avec des actions comme :\n`;
    prompt += `- "1. Vérifier l'exhaustivité des factures en comparant le journal des ventes avec les factures émises"\n`;
    prompt += `- "2. Contrôler l'échéancier des créances clients et identifier les créances douteuses"\n`;
    prompt += `- "3. Tester un échantillon de X factures pour vérifier l'exactitude des montants et de la TVA"\n`;
    prompt += `- "4. Vérifier la cohérence entre les créances clients (411) et les ventes (70X)"\n\n`;
    prompt += `**Commence immédiatement la génération du JSON, en utilisant les données contextuelles ci-dessus comme source de vérité pour adapter les phases et les exigences réglementaires aux spécificités de cette mission d'audit. N'oublie pas d'inclure des tâches spécifiques pour chaque cycle identifié dans le FEC.**`;

    return prompt;
  }

  /**
   * Construit le prompt pour le rapport complet
   */
  static buildReportPrompt(context) {
    let prompt = this.buildAnalysisPrompt(context);
    prompt += `\n\n**Demande supplémentaire :** Génère maintenant un rapport d'analyse complet et détaillé incluant :\n`;
    prompt += `1. Synthèse exécutive (résumé en 4-5 points clés)\n`;
    prompt += `2. Analyse détaillée de la situation financière\n`;
    prompt += `3. Analyse des cycles comptables et de leur poids\n`;
    prompt += `4. Analyse des soldes intermédiaires de gestion avec interprétation\n`;
    prompt += `5. Analyse du bilan (structure financière)\n`;
    prompt += `6. Points forts et opportunités\n`;
    prompt += `7. Points d'attention et risques\n`;
    prompt += `8. Recommandations stratégiques et opérationnelles\n`;
    prompt += `9. Conclusion\n\n`;
    prompt += `Format le rapport de manière professionnelle avec des titres de sections clairs.`;

    return prompt;
  }
}

