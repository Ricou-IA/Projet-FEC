import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, FileText, Save, Download } from 'lucide-react';

const ProgrammeTravailTemplate = ({ data, onUpdate }) => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setTasks(data);
    }
  }, [data]);

  const updateTask = (id, field, value) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === id) {
        const updated = { ...task, [field]: value };
        if (field === 'statut' && value === 'termine') {
          updated.dateRealisation = new Date().toISOString().split('T')[0];
        }
        return updated;
      }
      return task;
    });
    setTasks(updatedTasks);
    if (onUpdate) {
      onUpdate(updatedTasks);
    }
    // Sauvegarder dans localStorage
    saveToLocalStorage(updatedTasks);
  };

  const saveToLocalStorage = (tasksData) => {
    try {
      localStorage.setItem('programme_travail_data', JSON.stringify(tasksData));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('programme_travail_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        setTasks(parsed);
        if (onUpdate) {
          onUpdate(parsed);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    }
  };

  useEffect(() => {
    if (tasks.length === 0) {
      loadFromLocalStorage();
    }
  }, []);

  const exportToJSON = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `programme_travail_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (statut) => {
    switch (statut) {
      case 'termine':
        return <CheckCircle2 className="text-green-600" size={20} />;
      case 'en_cours':
        return <Clock className="text-yellow-600" size={20} />;
      default:
        return <Circle className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'termine':
        return 'bg-green-50 border-green-200';
      case 'en_cours':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getProgressStats = () => {
    const total = tasks.length;
    const termine = tasks.filter(t => t.statut === 'termine').length;
    const enCours = tasks.filter(t => t.statut === 'en_cours').length;
    const aFaire = tasks.filter(t => t.statut === 'a_faire').length;
    return { total, termine, enCours, aFaire };
  };

  const stats = getProgressStats();

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText size={48} className="mx-auto mb-4 text-gray-400" />
        <p>Aucune donnée de programme de travail disponible</p>
      </div>
    );
  }

  // Grouper les tâches par phase
  const tasksByPhase = tasks.reduce((acc, task) => {
    const phase = task.phase || 'Autre';
    if (!acc[phase]) {
      acc[phase] = [];
    }
    acc[phase].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Statistiques de progression */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-semibold text-gray-800">Progression du programme de travail</h5>
          <div className="flex gap-2">
            <button
              onClick={() => {
                saveToLocalStorage(tasks);
                alert('Progression sauvegardée !');
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Save size={14} />
              Sauvegarder
            </button>
            <button
              onClick={exportToJSON}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Download size={14} />
              Exporter JSON
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.termine}</div>
            <div className="text-xs text-gray-600">Terminé</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.enCours}</div>
            <div className="text-xs text-gray-600">En cours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">{stats.aFaire}</div>
            <div className="text-xs text-gray-600">À faire</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${(stats.termine / stats.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Liste des tâches par phase */}
      {Object.entries(tasksByPhase).map(([phase, phaseTasks]) => (
        <div key={phase} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-3 font-semibold">
            {phase}
          </div>
          <div className="divide-y divide-gray-200">
            {phaseTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 ${getStatusColor(task.statut)} transition-colors`}
              >
                <div className="flex items-start gap-4">
                  {/* Statut */}
                  <div className="flex-shrink-0 pt-1">
                    <button
                      onClick={() => {
                        const nextStatus = task.statut === 'a_faire' 
                          ? 'en_cours' 
                          : task.statut === 'en_cours' 
                          ? 'termine' 
                          : 'a_faire';
                        updateTask(task.id, 'statut', nextStatus);
                      }}
                      className="hover:opacity-80 transition-opacity"
                      title={`Statut: ${task.statut}`}
                    >
                      {getStatusIcon(task.statut)}
                    </button>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 space-y-3">
                    {/* Tâche et actions opérationnelles */}
                    <div>
                      <div className="font-medium text-gray-900 mb-2">{task.tache}</div>
                      {task.actionsOperatoires && task.actionsOperatoires.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                          {task.actionsOperatoires.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Exigence réglementaire et documentation */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Exigence réglementaire:</span>
                        <div className="text-gray-800 mt-1">{task.exigenceReglementaire}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Documentation requise:</span>
                        <div className="text-gray-800 mt-1">{task.documentationUtilisateur}</div>
                      </div>
                    </div>

                    {/* Champs de saisie */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Réalisé par
                        </label>
                        <input
                          type="text"
                          value={task.realisePar || ''}
                          onChange={(e) => updateTask(task.id, 'realisePar', e.target.value)}
                          placeholder="Nom de l'auditeur"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Date de réalisation
                        </label>
                        <input
                          type="date"
                          value={task.dateRealisation || ''}
                          onChange={(e) => updateTask(task.id, 'dateRealisation', e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Notes et commentaires
                      </label>
                      <textarea
                        value={task.notes || ''}
                        onChange={(e) => updateTask(task.id, 'notes', e.target.value)}
                        placeholder="Ajoutez vos notes, observations, références de documents..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgrammeTravailTemplate;

