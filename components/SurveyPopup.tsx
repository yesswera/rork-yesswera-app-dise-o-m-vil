import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, Star, Gift } from 'lucide-react-native';
import { Survey, SurveyQuestion } from '@/constants/types';
import Colors from '@/constants/colors';

interface SurveyPopupProps {
  survey: Survey;
  visible: boolean;
  onClose: () => void;
  onSubmit: (responses: { questionId: string; answer: string | number }[]) => void;
}

const { width } = Dimensions.get('window');

export default function SurveyPopup({ survey, visible, onClose, onSubmit }: SurveyPopupProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [textInput, setTextInput] = useState('');

  const currentQuestion = survey.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === survey.questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / survey.questions.length) * 100;

  const handleAnswer = (questionId: string, answer: string | number) => {
    setResponses((prev) => ({ ...prev, [questionId]: answer }));
    
    if (isLastQuestion) {
      const finalResponses = { ...responses, [questionId]: answer };
      const formattedResponses = Object.entries(finalResponses).map(([qId, ans]) => ({
        questionId: qId,
        answer: ans,
      }));
      onSubmit(formattedResponses);
      handleClose();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTextInput('');
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      handleAnswer(currentQuestion.id, textInput.trim());
    }
  };

  const handleClose = () => {
    setCurrentQuestionIndex(0);
    setResponses({});
    setTextInput('');
    onClose();
  };

  const renderQuestion = (question: SurveyQuestion) => {
    switch (question.type) {
      case 'rating':
        return (
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleAnswer(question.id, star)}
                style={styles.starButton}
              >
                <Star
                  size={48}
                  fill={typeof responses[question.id] === 'number' && (responses[question.id] as number) >= star ? Colors.primary : 'transparent'}
                  color={typeof responses[question.id] === 'number' && (responses[question.id] as number) >= star ? Colors.primary : '#CBD5E0'}
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'multiple_choice':
        return (
          <View style={styles.optionsContainer}>
            {question.options?.map((option, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleAnswer(question.id, option)}
                style={[
                  styles.optionButton,
                  responses[question.id] === option && styles.optionButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    responses[question.id] === option && styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'yes_no':
        return (
          <View style={styles.yesNoContainer}>
            <TouchableOpacity
              onPress={() => handleAnswer(question.id, 'yes')}
              style={[
                styles.yesNoButton,
                styles.yesButton,
                responses[question.id] === 'yes' && styles.yesButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.yesNoText,
                  responses[question.id] === 'yes' && styles.yesNoTextSelected,
                ]}
              >
                Sí
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAnswer(question.id, 'no')}
              style={[
                styles.yesNoButton,
                styles.noButton,
                responses[question.id] === 'no' && styles.noButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.yesNoText,
                  responses[question.id] === 'no' && styles.yesNoTextSelected,
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'scale':
        return (
          <View style={styles.scaleContainer}>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>{question.scaleLabels?.min}</Text>
              <Text style={styles.scaleLabel}>{question.scaleLabels?.max}</Text>
            </View>
            <View style={styles.scaleButtons}>
              {Array.from(
                { length: (question.scaleMax || 10) - (question.scaleMin || 0) + 1 },
                (_, i) => (question.scaleMin || 0) + i
              ).map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => handleAnswer(question.id, value)}
                  style={[
                    styles.scaleButton,
                    responses[question.id] === value && styles.scaleButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.scaleButtonText,
                      responses[question.id] === value && styles.scaleButtonTextSelected,
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'text':
        return (
          <View style={styles.textContainer}>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Escribe tu respuesta..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={handleTextSubmit}
              style={[
                styles.submitButton,
                !textInput.trim() && styles.submitButtonDisabled,
              ]}
              disabled={!textInput.trim()}
            >
              <Text style={styles.submitButtonText}>
                {isLastQuestion ? 'Enviar' : 'Siguiente'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.questionNumber}>
              Pregunta {currentQuestionIndex + 1} de {survey.questions.length}
            </Text>
            <Text style={styles.questionText}>{currentQuestion?.question}</Text>

            {renderQuestion(currentQuestion)}

            {survey.incentive && currentQuestionIndex === 0 && (
              <View style={styles.incentiveContainer}>
                <Gift size={20} color={Colors.primary} />
                <Text style={styles.incentiveText}>{survey.incentive.description}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: width - 40,
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E2E8F0',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  content: {
    padding: 24,
  },
  questionNumber: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 24,
    lineHeight: 28,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  starButton: {
    padding: 4,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  optionText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  yesButton: {
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
  },
  yesButtonSelected: {
    backgroundColor: '#10B981',
  },
  noButton: {
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
  },
  noButtonSelected: {
    backgroundColor: '#EF4444',
  },
  yesNoText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#475569',
  },
  yesNoTextSelected: {
    color: '#FFFFFF',
  },
  scaleContainer: {
    marginTop: 16,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scaleLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  scaleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  scaleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  scaleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#475569',
  },
  scaleButtonTextSelected: {
    color: '#FFFFFF',
  },
  textContainer: {
    gap: 16,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  incentiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  incentiveText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500' as const,
  },
});
