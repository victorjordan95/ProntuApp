# ProntuApp — Design Spec

**Data:** 2026-03-14
**Status:** Aprovado
**Stack:** Vite + React 19 + TypeScript + Tailwind CSS
**Contexto:** App web client-side para médicos de clínica geral acompanharem consultas em tempo real.

---

## 1. Visão Geral

O ProntuApp transcreve o áudio da consulta via Web Speech API, extrai entidades clínicas com regex + dicionário médico, e gera automaticamente um rascunho de prontuário no formato SOAP. Todo processamento é local (privacidade LGPD — nenhum dado sai do navegador).

**Usuário-alvo:** Médico de clínica geral / medicina de família em consultório.
**Dispositivos:** Desktop e tablet (responsivo).
**Sem backend, sem login no MVP.**

---

## 2. Arquitetura

```
Web Speech API
      │ texto bruto (interim + final)
      ▼
useSpeechRecognition   ←── controla: start/pause/stop, speaker toggle
      │ { transcript: Segment[], isRecording, duration, speaker }
      ▼
useNLP                 ←── recebe segmentos finalizados (final: true)
      │ roda medicalDictionary + alertRules sobre cada segmento
      ▼
useEntities            ←── agrega entidades detectadas por categoria
      │ { diagnoses, medications, symptoms, vitals, alerts }
      ▼
useReducer (App.tsx)   ←── estado global da consulta
      │
      ├─► TranscriptPanel     (coluna esquerda, ~60%)
      └─► InsightsPanel       (coluna direita, ~40%)
              ├─ Aba Insights / Alertas
              ├─ Aba SOAP (soapBuilder.ts)
              └─ Aba Checklist
```

**Fluxo unidirecional.** Nenhum componente escreve diretamente nas entidades. O `soapBuilder.ts` é função pura. O NLP processa apenas segmentos `final: true` para evitar ruído dos resultados intermediários.

---

## 3. Componentes

### `TranscriptPanel`
- Coluna esquerda (~60% da largura)
- Exibe segmentos transcritos em ordem cronológica com scroll automático
- Cada segmento: rótulo do locutor (Médico/Paciente), timestamp relativo, texto com entidades destacadas por cor
  - Sintoma → amarelo
  - Medicamento → roxo
  - Valor clínico → verde
  - Diagnóstico → azul
- Banner de consentimento fixo no topo durante gravação

### `RecordingControls`
- Barra inferior fixa
- Botão iniciar / pausar / encerrar consulta
- Toggle Médico ↔ Paciente (alternância manual de locutor)
- Timer de duração da consulta
- Indicador pulsante vermelho durante gravação ativa
- Desabilitado elegantemente se Web Speech API indisponível

### `InsightsPanel`
- Coluna direita (~40% da largura)
- Três abas:

#### Aba Insights
- Lista de alertas clínicos em tempo real
- Cards com três níveis de severidade: **info** / **aviso** / **crítico**
- Sempre exibidos como "sugestões de apoio clínico", nunca como diagnóstico

#### Aba SOAP (`SoapEditor`)
- Textarea controlada, pré-preenchida pelo `soapBuilder`, editável pelo médico
- Label visível: *"Rascunho gerado por IA — revise antes de finalizar"*
- Botões: copiar para clipboard, download `.txt`

#### Aba Checklist
- Itens pendentes inferidos das entidades detectadas
- Exemplos: "Solicitar ECG" (dor precordial), "Verificar glicemia em jejum" (diabetes mencionado)

**Todos os componentes são puramente apresentacionais** — recebem props, não acessam estado global diretamente.

---

## 4. Pipeline NLP (`lib/`)

### `medicalDictionary.ts`
Objeto estruturado com 4 categorias. Cada entrada tem termo, variantes/abreviações e categoria.

```ts
// Estrutura
{
  sintomas: string[],        // ["dor no peito", "dispneia", "tontura", ...]
  medicamentos: string[],    // ["losartana", "metformina", "atenolol", ...]
  diagnosticos: string[],    // ["hipertensão", "diabetes", "asma", ...]
  valores: {                 // regex para extração de valores numéricos
    pa: RegExp,              // ex: /(\d{2,3})\s*[\/x]\s*(\d{2,3})/i
    glicemia: RegExp,
    peso: RegExp,
    fc: RegExp,
  }
}
```

### `alertRules.ts`
Funções puras: `applyRules(entities) → Alert[]`

| Condição | Severidade | Mensagem |
|---|---|---|
| PA sistólica ≥ 180 | crítico | "Crise hipertensiva" |
| PA sistólica 140–179 | aviso | "Hipertensão Estágio 1" |
| PA sistólica 120–139 | info | "Pré-hipertensão" |
| Glicemia > 200 | aviso | "Hiperglicemia" |
| Glicemia > 300 | crítico | "Hiperglicemia grave" |
| Dor precordial detectada | info | "Considerar protocolo cardíaco" |

### `checklistRules.ts`
Fonte dedicada para itens do checklist. Funções puras: `buildChecklist(entities) → ChecklistItem[]`

| Condição detectada | Item gerado |
|---|---|
| Dor precordial | "Solicitar ECG" |
| Diabetes mencionado | "Verificar glicemia em jejum" |
| Hipertensão detectada | "Orientar dieta hipossódica" |
| Medicamento novo prescrito | "Confirmar posologia com o paciente" |

### `soapBuilder.ts`
Função pura: `buildSOAP(entities, segments) → SOAPDraft`

| Seção | Fonte |
|---|---|
| S — Subjetivo | Sintomas dos segmentos do paciente |
| O — Objetivo | Valores clínicos (PA, glicemia, peso, FC) |
| A — Avaliação | Diagnósticos mencionados |
| P — Plano | Medicamentos + itens do checklist |

### `useNLP.ts`
- Processa apenas segmentos `final: true`
- Roda regex do dicionário em O(n) sobre o texto
- Chama `useEntities` internamente para agregar o resultado
- Retorna entidades com posição no texto (para highlight)
- Comentários explicando a lógica para facilitar substituição futura por TF.js

---

## 5. Hooks

### `useSpeechRecognition.ts`
```ts
// Interface pública
{
  transcript: Segment[],
  isRecording: boolean,
  isPaused: boolean,
  duration: number,          // segundos
  currentSpeaker: 'doctor' | 'patient',
  start: () => void,
  pause: () => void,
  stop: () => void,
  toggleSpeaker: () => void,
  isSupported: boolean,
}
```
- `continuous: true`, `lang: 'pt-BR'`, `interimResults: true`
- Reconexão automática silenciosa (máx 3 tentativas) se interrompido inesperadamente
- Nunca armazena áudio — apenas texto transcrito em memória

### `useNLP.ts`
```ts
// Interface pública
{
  entities: Entities,
  alerts: Alert[],
  processSegment: (segment: Segment) => void,
}
```

### `useEntities.ts`
Agrega e deduplica entidades ao longo da consulta. Mantém histórico por categoria.

---

## 6. Estado Global (`App.tsx`)

```ts
type ConsultaState = {
  segments: Segment[],
  entities: Entities,
  alerts: Alert[],
  soapDraft: SOAPDraft,
  checklist: ChecklistItem[],
  status: 'idle' | 'recording' | 'paused' | 'ended',
  duration: number,
}
```

Actions do reducer: `ADD_SEGMENT`, `UPDATE_ENTITIES`, `ADD_ALERT`, `UPDATE_SOAP`, `SET_STATUS`, `RESET`.

`UPDATE_SOAP` é disparado automaticamente após cada `UPDATE_ENTITIES` — o `soapBuilder.ts` é chamado como efeito colateral no reducer (ou em um `useEffect` que observa `entities`), garantindo que o rascunho SOAP esteja sempre sincronizado com as entidades mais recentes.

---

## 7. Tratamento de Erros

| Situação | Comportamento |
|---|---|
| Web Speech API indisponível | Banner: "Use Chrome ou Edge" — modo manual ativo |
| Permissão de microfone negada | Toast com instrução para habilitar nas configurações |
| Reconhecimento interrompido | Reconexão automática silenciosa (máx 3x), depois aviso |
| Navegador sem suporte a clipboard | Fallback: selecionar texto do SOAP manualmente |

---

## 8. Privacidade & LGPD

- Banner de consentimento visível durante toda a gravação
- Áudio nunca armazenado (a Web Speech API não expõe o stream de áudio)
- Transcrição salva apenas em memória — limpa ao fechar/recarregar a página
- Zero chamadas de rede durante a consulta
- Insights exibidos sempre como "sugestões de apoio", nunca como diagnóstico

---

## 9. Design Visual

**Tema:** Acolhedor & Humano
- Cor primária: verde saúde (`#059669`)
- Fundo: neutro quente (`#fafaf9`)
- Tipografia: system-ui, clean, sem ser fria
- Totalmente responsivo — layout em coluna única abaixo de 768px (tablet portrait): `TranscriptPanel` primeiro, `InsightsPanel` abaixo com abas compactas

---

## 10. Estrutura de Arquivos

```
src/
  components/
    TranscriptPanel.tsx
    InsightsPanel.tsx
    SoapEditor.tsx
    Checklist.tsx
    RecordingControls.tsx
  hooks/
    useSpeechRecognition.ts
    useNLP.ts
    useEntities.ts
  lib/
    medicalDictionary.ts
    soapBuilder.ts
    alertRules.ts
    checklistRules.ts
  App.tsx
  main.tsx
docs/
  superpowers/
    specs/
      2026-03-14-prontuapp-design.md
```

---

## 11. Testes

- `medicalDictionary`, `alertRules`, `checklistRules`, `soapBuilder` — Vitest puro (funções puras, sem DOM)
- `useEntities` — Vitest puro (lógica de agregação e deduplicação tem critérios claros de correção)
- `useSpeechRecognition` — mock da SpeechRecognition API
- Componentes — React Testing Library para estados principais (idle, gravando, pausado, com entidades)

---

## 12. Fora do Escopo (MVP)

- Login / autenticação
- Persistência de consultas anteriores
- Integração com Ninsaúde ou outros sistemas
- Modelo TF.js para NER (evolução futura)
- Diferenciação automática de locutor (Web Speech API não suporta)
- Gravação e exportação de áudio
