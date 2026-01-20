import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import {
  Plus,
  MessageSquare,
  Edit3,
  Trash2,
  Eye,
  BarChart3,
  Star,
  CheckCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { API_BASE } from '@/constants/api';
import { useAuth } from '@/contexts/auth';
import { Toast } from '@/utils/toast';

interface Survey {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: 'rating' | 'multiple_choice' | 'text';
  pregunta: string;
  opciones?: string[];
  activa: boolean;
  targetRole: 'cliente' | 'repartidor' | 'negocio' | 'todos';
  respuestas: number;
  createdAt: string;
}

export default function AdminSurveysScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSurvey, setNewSurvey] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'rating' as Survey['tipo'],
    pregunta: '',
    opciones: [''],
    activa: true,
    targetRole: 'todos' as Survey['targetRole'],
  });

  useEffect(() => {
    loadSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/surveys`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Admin-Password': 'TESTTEST123',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSurveys(data.surveys || []);
      } else {
        loadMockSurveys();
      }
    } catch (error) {
      console.error('Error loading surveys:', error);
      loadMockSurveys();
    } finally {
      setLoading(false);
    }
  };

  const loadMockSurveys = () => {
    setSurveys([
      {
        id: '1',
        titulo: 'Satisfacción del Servicio',
        descripcion: 'Evalúa la calidad general del servicio',
        tipo: 'rating',
        pregunta: '¿Qué tan satisfecho estás con el servicio?',
        activa: true,
        targetRole: 'cliente',
        respuestas: 234,
        createdAt: '2024-01-15',
      },
      {
        id: '2',
        titulo: 'Experiencia de Entrega',
        descripcion: 'Opinión sobre el proceso de entrega',
        tipo: 'multiple_choice',
        pregunta: '¿Cómo fue tu experiencia de entrega?',
        opciones: ['Excelente', 'Buena', 'Regular', 'Mala'],
        activa: true,
        targetRole: 'cliente',
        respuestas: 189,
        createdAt: '2024-01-18',
      },
      {
        id: '3',
        titulo: 'Feedback Repartidores',
        descripcion: 'Mejoras sugeridas por repartidores',
        tipo: 'text',
        pregunta: '¿Qué podríamos mejorar en la app?',
        activa: false,
        targetRole: 'repartidor',
        respuestas: 45,
        createdAt: '2024-01-10',
      },
      {
        id: '4',
        titulo: 'Satisfacción Negocios',
        descripcion: 'Evaluación de herramientas para negocios',
        tipo: 'rating',
        pregunta: '¿Qué tan útiles son las herramientas?',
        activa: true,
        targetRole: 'negocio',
        respuestas: 67,
        createdAt: '2024-01-12',
      },
    ]);
  };

  const handleCreateSurvey = async () => {
    if (!newSurvey.titulo || !newSurvey.pregunta) {
      Toast.error('Completa todos los campos requeridos');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/analytics/surveys/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Admin-Password': 'TESTTEST123',
        },
        body: JSON.stringify(newSurvey),
      });

      if (response.ok) {
        Toast.success('Encuesta creada exitosamente');
        setShowCreateModal(false);
        loadSurveys();
        setNewSurvey({
          titulo: '',
          descripcion: '',
          tipo: 'rating',
          pregunta: '',
          opciones: [''],
          activa: true,
          targetRole: 'todos',
        });
      } else {
        Toast.error('Error al crear encuesta');
      }
    } catch (error) {
      console.error('Error creating survey:', error);
      Toast.error('Error al crear encuesta');
    }
  };

  const toggleSurveyStatus = async (surveyId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/admin/surveys/${surveyId}/toggle`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Admin-Password': 'TESTTEST123',
        },
      });

      if (response.ok) {
        setSurveys((prev) =>
          prev.map((s) => (s.id === surveyId ? { ...s, activa: !currentStatus } : s))
        );
        Toast.success(!currentStatus ? 'Encuesta activada' : 'Encuesta desactivada');
      }
    } catch (error) {
      console.error('Error toggling survey:', error);
    }
  };

  const getSurveyTypeIcon = (tipo: Survey['tipo']) => {
    switch (tipo) {
      case 'rating':
        return <Star size={18} color={Colors.warning} />;
      case 'multiple_choice':
        return <CheckCircle size={18} color={Colors.primary} />;
      case 'text':
        return <MessageSquare size={18} color={Colors.accent} />;
    }
  };

  const getSurveyTypeLabel = (tipo: Survey['tipo']) => {
    switch (tipo) {
      case 'rating':
        return 'Calificación';
      case 'multiple_choice':
        return 'Opción Múltiple';
      case 'text':
        return 'Texto Libre';
    }
  };

  const getTargetLabel = (role: Survey['targetRole']) => {
    switch (role) {
      case 'cliente':
        return '👤 Clientes';
      case 'repartidor':
        return '🚗 Repartidores';
      case 'negocio':
        return '🏪 Negocios';
      case 'todos':
        return '👥 Todos';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando encuestas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MessageSquare size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{surveys.length}</Text>
              <Text style={styles.statLabel}>Total Encuestas</Text>
            </View>

            <View style={styles.statCard}>
              <CheckCircle size={24} color={Colors.success} />
              <Text style={styles.statValue}>{surveys.filter((s) => s.activa).length}</Text>
              <Text style={styles.statLabel}>Activas</Text>
            </View>

            <View style={styles.statCard}>
              <BarChart3 size={24} color={Colors.accent} />
              <Text style={styles.statValue}>
                {surveys.reduce((sum, s) => sum + s.respuestas, 0)}
              </Text>
              <Text style={styles.statLabel}>Respuestas</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
            <Plus size={20} color={Colors.white} />
            <Text style={styles.createButtonText}>Crear Nueva Encuesta</Text>
          </TouchableOpacity>

          {showCreateModal && (
            <View style={styles.createModal}>
              <Text style={styles.modalTitle}>Nueva Encuesta</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Título *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Satisfacción del Servicio"
                  placeholderTextColor={Colors.text.light}
                  value={newSurvey.titulo}
                  onChangeText={(text) => setNewSurvey({ ...newSurvey, titulo: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Breve descripción de la encuesta..."
                  placeholderTextColor={Colors.text.light}
                  value={newSurvey.descripcion}
                  onChangeText={(text) => setNewSurvey({ ...newSurvey, descripcion: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pregunta *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="¿Qué tan satisfecho estás?"
                  placeholderTextColor={Colors.text.light}
                  value={newSurvey.pregunta}
                  onChangeText={(text) => setNewSurvey({ ...newSurvey, pregunta: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de Respuesta</Text>
                <View style={styles.typeSelector}>
                  {(['rating', 'multiple_choice', 'text'] as const).map((tipo) => (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.typeButton,
                        newSurvey.tipo === tipo && styles.typeButtonActive,
                      ]}
                      onPress={() => setNewSurvey({ ...newSurvey, tipo })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newSurvey.tipo === tipo && styles.typeButtonTextActive,
                        ]}
                      >
                        {getSurveyTypeLabel(tipo)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dirigida a</Text>
                <View style={styles.typeSelector}>
                  {(['todos', 'cliente', 'repartidor', 'negocio'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        newSurvey.targetRole === role && styles.typeButtonActive,
                      ]}
                      onPress={() => setNewSurvey({ ...newSurvey, targetRole: role })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newSurvey.targetRole === role && styles.typeButtonTextActive,
                        ]}
                      >
                        {getTargetLabel(role)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleCreateSurvey}>
                  <Text style={styles.saveButtonText}>Crear Encuesta</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.surveysList}>
            <Text style={styles.sectionTitle}>Encuestas Existentes</Text>
            {surveys.map((survey) => (
              <View key={survey.id} style={styles.surveyCard}>
                <View style={styles.surveyHeader}>
                  <View style={styles.surveyTitleRow}>
                    {getSurveyTypeIcon(survey.tipo)}
                    <Text style={styles.surveyTitle}>{survey.titulo}</Text>
                  </View>
                  <Switch
                    value={survey.activa}
                    onValueChange={() => toggleSurveyStatus(survey.id, survey.activa)}
                    trackColor={{ false: Colors.border.light, true: Colors.primary + '60' }}
                    thumbColor={survey.activa ? Colors.primary : Colors.text.light}
                  />
                </View>

                <Text style={styles.surveyQuestion}>{survey.pregunta}</Text>

                <View style={styles.surveyMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>{getTargetLabel(survey.targetRole)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>
                      {getSurveyTypeLabel(survey.tipo)}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <BarChart3 size={14} color={Colors.text.secondary} />
                    <Text style={styles.metaValue}>{survey.respuestas} respuestas</Text>
                  </View>
                </View>

                <View style={styles.surveyActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Eye size={18} color={Colors.primary} />
                    <Text style={styles.actionButtonText}>Ver Resultados</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Edit3 size={18} color={Colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Trash2 size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {surveys.length === 0 && (
              <View style={styles.emptyState}>
                <MessageSquare size={48} color={Colors.text.light} />
                <Text style={styles.emptyText}>No hay encuestas creadas</Text>
                <Text style={styles.emptySubtext}>Crea tu primera encuesta</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 20,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  createModal: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  typeButtonTextActive: {
    color: Colors.white,
  },
  roleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  surveysList: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  surveyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  surveyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  surveyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  surveyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    flex: 1,
  },
  surveyQuestion: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  surveyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.background.tertiary,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  surveyActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background.tertiary,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.light,
    marginTop: 4,
  },
});
