-- ============================================
-- SISTEMA DE SOPORTE Y CHAT - Yesswera
-- Migración: 009_support_system.sql
-- Fecha: 2026-02-06
-- ============================================

-- ============================================
-- 1. TABLA DE CONVERSACIONES DE CHAT
-- ============================================
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(6) UNIQUE NOT NULL, -- ID corto: A1B2C3
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- Participantes
    participant_1_id UUID NOT NULL REFERENCES users(id),
    participant_1_type VARCHAR(20) NOT NULL, -- client, driver, business, admin
    participant_2_id UUID NOT NULL REFERENCES users(id),
    participant_2_type VARCHAR(20) NOT NULL,

    -- Estado
    status VARCHAR(20) DEFAULT 'active', -- active, closed, archived, escalated
    escalated_at TIMESTAMPTZ,
    escalated_reason TEXT,

    last_message_at TIMESTAMPTZ,
    unread_count_1 INT DEFAULT 0,
    unread_count_2 INT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 1.1 FUNCIÓN PARA GENERAR CASE NUMBER CORTO
-- ============================================
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sin I,O,0,1 para evitar confusión
    result VARCHAR(6) := '';
    i INT;
    attempts INT := 0;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INT, 1);
        END LOOP;

        -- Verificar que no exista
        IF NOT EXISTS (SELECT 1 FROM chat_conversations WHERE case_number = result) THEN
            NEW.case_number := result;
            EXIT;
        END IF;

        attempts := attempts + 1;
        IF attempts > 100 THEN
            RAISE EXCEPTION 'No se pudo generar case_number único';
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_case_number
    BEFORE INSERT ON chat_conversations
    FOR EACH ROW
    WHEN (NEW.case_number IS NULL)
    EXECUTE FUNCTION generate_case_number();

-- ============================================
-- 2. TABLA DE MENSAJES DE CHAT
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_type VARCHAR(20) NOT NULL, -- client, driver, business, admin

    -- Contenido
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, location, system
    content TEXT NOT NULL,
    image_url TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),

    -- Estado
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TABLA DE TICKETS DE SOPORTE
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL, -- YSW-2026-000001

    -- Usuario que reporta
    user_id UUID NOT NULL REFERENCES users(id),
    user_type VARCHAR(20) NOT NULL,

    -- Orden relacionada (opcional)
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- Categoría y prioridad
    category VARCHAR(50) NOT NULL, -- order_issue, payment, driver, business, app_bug, other
    subcategory VARCHAR(50), -- not_delivered, wrong_items, driver_rude, etc.
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

    -- Contenido
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- Estado y resolución
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, waiting_user, resolved, closed, escalated
    resolution_type VARCHAR(50), -- refund, replacement, apology, no_action, escalated
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),

    -- Auto-resolución
    auto_resolution_attempted BOOLEAN DEFAULT FALSE,
    auto_resolution_result VARCHAR(50), -- success, failed, needs_human

    -- Asignación
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,

    -- SLA
    sla_deadline TIMESTAMPTZ, -- Tiempo límite para resolver
    sla_breached BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. TABLA DE MENSAJES DE TICKET
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_type VARCHAR(20) NOT NULL, -- user, admin, system

    -- Contenido
    message TEXT NOT NULL,
    attachments JSONB, -- [{url, type, name}]

    -- Si es mensaje del sistema
    is_system_message BOOLEAN DEFAULT FALSE,
    system_action VARCHAR(50), -- status_change, assignment, auto_resolution, etc.

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TABLA DE REGISTRO DE INCIDENTES
-- ============================================
CREATE TABLE IF NOT EXISTS incident_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referencias
    ticket_id UUID REFERENCES support_tickets(id),
    order_id UUID REFERENCES orders(id),
    user_id UUID REFERENCES users(id),

    -- Tipo de incidente
    incident_type VARCHAR(50) NOT NULL, -- safety, fraud, harassment, accident, dispute
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical

    -- Descripción
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- Involucrados
    involved_parties JSONB, -- [{user_id, role, notes}]

    -- Acciones tomadas
    actions_taken JSONB, -- [{action, timestamp, by}]

    -- Escalación externa
    external_escalation BOOLEAN DEFAULT FALSE,
    external_agency VARCHAR(100), -- policia, proteccion_civil, etc.
    external_reference VARCHAR(100), -- Número de caso externo

    -- Estado
    status VARCHAR(20) DEFAULT 'open', -- open, investigating, resolved, closed
    resolution TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES users(id)
);

-- ============================================
-- 6. TABLA DE ACCIONES DE SOPORTE
-- ============================================
CREATE TABLE IF NOT EXISTS support_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(6) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- notify_user, refund, cancel_order, escalate_authority, close_case
    action_code VARCHAR(30) NOT NULL, -- Código de la acción predefinida

    -- Destinatarios
    target_user_ids UUID[] NOT NULL, -- A quiénes se notifica

    -- Contenido
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    instructions TEXT, -- Pasos a seguir

    -- Si se escala a autoridades
    external_agency VARCHAR(100), -- policia, proteccion_civil, profeco, etc.
    external_reference VARCHAR(100), -- Número de caso externo

    -- Quien ejecutó
    executed_by UUID NOT NULL REFERENCES users(id),
    executed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Push notification enviada?
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMPTZ
);

-- ============================================
-- 6.1 ACCIONES PREDEFINIDAS
-- ============================================
CREATE TABLE IF NOT EXISTS support_action_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    category VARCHAR(30) NOT NULL, -- resolution, escalation, information
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    instructions TEXT,
    requires_external BOOLEAN DEFAULT FALSE, -- Requiere escalar a autoridad?
    external_agency VARCHAR(100),
    icon VARCHAR(30), -- Icono para mostrar en UI
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Insertar acciones predefinidas
INSERT INTO support_action_templates (code, category, title, message, instructions, icon, sort_order) VALUES
-- Resoluciones
('refund_full', 'resolution', 'Reembolso Completo',
 'Hemos procesado un reembolso completo de tu pedido.',
 'El monto será reflejado en tu método de pago en 3-5 días hábiles.',
 'dollar-sign', 1),

('refund_partial', 'resolution', 'Reembolso Parcial',
 'Hemos procesado un reembolso parcial por los inconvenientes.',
 'Revisa tu método de pago en los próximos días.',
 'percent', 2),

('coupon_compensation', 'resolution', 'Cupón de Compensación',
 'Te hemos otorgado un cupón de compensación para tu próximo pedido.',
 'El cupón aparecerá automáticamente en tu próxima orden.',
 'gift', 3),

('order_replacement', 'resolution', 'Reposición de Pedido',
 'Hemos autorizado la reposición de tu pedido sin costo adicional.',
 'Un nuevo repartidor recogerá tu pedido. Espera la notificación de asignación.',
 'refresh-cw', 4),

('case_closed_resolved', 'resolution', 'Caso Resuelto',
 'Tu caso ha sido resuelto satisfactoriamente.',
 'Si tienes más dudas, puedes crear un nuevo ticket de soporte.',
 'check-circle', 5),

-- Información
('driver_warning', 'information', 'Acción Tomada con Repartidor',
 'Hemos tomado las medidas correspondientes con el repartidor involucrado.',
 'Agradecemos tu reporte. Nos ayuda a mejorar el servicio.',
 'alert-triangle', 10),

('business_contacted', 'information', 'Negocio Contactado',
 'Nos hemos comunicado con el negocio respecto a tu situación.',
 'El negocio tomará las acciones necesarias.',
 'store', 11),

('under_investigation', 'information', 'Caso en Investigación',
 'Tu caso está siendo investigado por nuestro equipo.',
 'Te notificaremos cuando tengamos una resolución.',
 'search', 12),

-- Escalaciones
('escalate_police', 'escalation', 'Escalado a Autoridades',
 'Tu caso ha sido escalado a las autoridades correspondientes.',
 'Se ha generado un expediente con número de caso. Puedes acudir a la autoridad con este número para dar seguimiento.',
 'shield', 20),

('escalate_profeco', 'escalation', 'Escalado a PROFECO',
 'Tu caso ha sido preparado para presentar ante PROFECO.',
 'Descarga tu expediente del caso y preséntalo en la oficina de PROFECO más cercana.',
 'file-text', 21),

('escalate_civil', 'escalation', 'Escalado a Protección Civil',
 'Tu caso requiere intervención de Protección Civil.',
 'Hemos notificado a las autoridades. Si es urgente, llama al 911.',
 'phone', 22)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 6.2 TIMELINE DE CASO (Historia completa)
-- ============================================
CREATE TABLE IF NOT EXISTS case_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(6) NOT NULL,

    -- Tipo de evento
    event_type VARCHAR(30) NOT NULL, -- order_created, order_accepted, driver_assigned, chat_started, message_sent, location_update, issue_reported, action_taken, case_closed

    -- Actor
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(20), -- client, driver, business, admin, system

    -- Datos del evento
    event_data JSONB, -- Datos específicos del evento
    description TEXT NOT NULL,

    -- Ubicación (si aplica)
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_timeline_case ON case_timeline(case_number);
CREATE INDEX IF NOT EXISTS idx_case_timeline_created ON case_timeline(created_at);

-- ============================================
-- 6.3 EXPEDIENTE DE CASO (Para exportar)
-- ============================================
CREATE TABLE IF NOT EXISTS case_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(6) NOT NULL,
    report_number VARCHAR(20) UNIQUE NOT NULL, -- EXP-2026-000001

    -- Contenido del reporte
    summary TEXT NOT NULL,
    timeline_snapshot JSONB NOT NULL, -- Copia del timeline al momento de generar
    participants JSONB NOT NULL, -- Info de participantes
    order_details JSONB, -- Detalles de la orden
    chat_transcript JSONB, -- Transcripción del chat
    actions_taken JSONB, -- Acciones tomadas por soporte

    -- Para autoridades
    for_external_agency VARCHAR(100),
    external_case_number VARCHAR(100),

    -- Generado por
    generated_by UUID NOT NULL REFERENCES users(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Acceso
    access_code VARCHAR(20), -- Código para que usuario acceda al reporte
    expires_at TIMESTAMPTZ -- Expiración del acceso
);

-- ============================================
-- 7. TABLA DE RESPUESTAS RÁPIDAS (Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS support_quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    trigger_keywords TEXT[], -- Palabras clave que activan esta respuesta
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    action_type VARCHAR(50), -- none, refund, cancel_order, reassign_driver
    action_params JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chat_conversations_order ON chat_conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participant1 ON chat_conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participant2 ON chat_conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

CREATE INDEX IF NOT EXISTS idx_incident_logs_ticket ON incident_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_incident_logs_order ON incident_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_incident_logs_severity ON incident_logs(severity);
CREATE INDEX IF NOT EXISTS idx_incident_logs_status ON incident_logs(status);

-- ============================================
-- 8. FUNCIÓN PARA GENERAR NÚMERO DE TICKET
-- ============================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(ticket_number FROM 10 FOR 6) AS INT)
    ), 0) + 1
    INTO seq_num
    FROM support_tickets
    WHERE ticket_number LIKE 'YSW-' || year_part || '-%';

    NEW.ticket_number := 'YSW-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL)
    EXECUTE FUNCTION generate_ticket_number();

-- ============================================
-- 9. FUNCIÓN PARA CALCULAR SLA
-- ============================================
CREATE OR REPLACE FUNCTION calculate_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- SLA basado en prioridad
    CASE NEW.priority
        WHEN 'urgent' THEN
            NEW.sla_deadline := NOW() + INTERVAL '1 hour';
        WHEN 'high' THEN
            NEW.sla_deadline := NOW() + INTERVAL '4 hours';
        WHEN 'normal' THEN
            NEW.sla_deadline := NOW() + INTERVAL '24 hours';
        WHEN 'low' THEN
            NEW.sla_deadline := NOW() + INTERVAL '48 hours';
        ELSE
            NEW.sla_deadline := NOW() + INTERVAL '24 hours';
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_sla
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sla_deadline();

-- ============================================
-- 10. RESPUESTAS RÁPIDAS PREDEFINIDAS
-- ============================================
INSERT INTO support_quick_replies (category, trigger_keywords, title, message, action_type) VALUES
('order_issue', ARRAY['no llegó', 'no llego', 'no ha llegado', 'pedido perdido'],
 'Pedido no entregado',
 'Lamentamos que tu pedido no haya llegado. Estamos verificando la ubicación de tu repartidor. Si no se resuelve en 10 minutos, te haremos un reembolso completo.',
 'none'),

('order_issue', ARRAY['incorrecto', 'equivocado', 'mal pedido', 'no es lo que pedí'],
 'Pedido incorrecto',
 'Disculpa las molestias. Por favor envíanos una foto del pedido que recibiste para procesar tu reembolso o reposición.',
 'none'),

('order_issue', ARRAY['frío', 'frio', 'tardó mucho', 'tardo mucho'],
 'Pedido demorado/frío',
 'Lamentamos la demora. Como compensación, te otorgamos un cupón de $30 para tu próximo pedido. El código es: DISCULPA30',
 'none'),

('driver', ARRAY['grosero', 'maleducado', 'irrespetuoso', 'mal trato'],
 'Comportamiento del repartidor',
 'Tomamos muy en serio el trato a nuestros usuarios. Hemos registrado tu queja y tomaremos las medidas necesarias con el repartidor.',
 'none'),

('driver', ARRAY['no contesta', 'no responde', 'no llama'],
 'Repartidor no responde',
 'Estamos intentando contactar a tu repartidor. Si no responde en 5 minutos, reasignaremos tu pedido a otro repartidor disponible.',
 'reassign_driver'),

('payment', ARRAY['cobro doble', 'me cobraron dos veces', 'cargo duplicado'],
 'Cobro duplicado',
 'Verificamos tu pago y confirmas el cobro duplicado. Procesaremos el reembolso en las próximas 24-48 horas.',
 'refund'),

('business', ARRAY['cerrado', 'no abre', 'no está abierto'],
 'Negocio cerrado',
 'El negocio aparece cerrado. Cancelaremos tu pedido sin costo y te otorgamos un cupón de $20 por la molestia: CERRADO20',
 'cancel_order')
ON CONFLICT DO NOTHING;

-- ============================================
-- 11. HABILITAR REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
