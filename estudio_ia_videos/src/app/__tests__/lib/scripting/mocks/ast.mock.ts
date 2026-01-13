
// Mock de uma AST simples com um slide
export const mockAstSimple = {
  type: 'presentation',
  properties: {
    title: 'Título da Apresentação',
  },
  children: [
    {
      type: 'slide',
      children: [
        { type: 'shape', subtype: 'title', value: 'Título do Slide 1' },
        { type: 'shape', subtype: 'body', value: 'Este é o corpo do slide.' },
      ],
    },
  ],
};

// Mock de uma AST com notas do apresentador
export const mockAstWithSpeakerNotes = {
  type: 'presentation',
  children: [
    {
      type: 'slide',
      children: [
        { type: 'shape', subtype: 'title', value: 'Slide com Notas' },
        { type: 'shape', subtype: 'body', value: 'Conteúdo principal do slide.' },
        {
          type: 'shape',
          subtype: 'notes',
          value: 'Esta é a nota do apresentador. Deve ser usada como narração.',
        },
      ],
    },
  ],
};

// Mock de uma AST mais complexa com múltiplos slides
export const mockAstComplex = {
  type: 'presentation',
  properties: {
    title: 'Apresentação Complexa',
  },
  children: [
    // Slide 1
    {
      type: 'slide',
      children: [
        { type: 'shape', subtype: 'title', value: 'Slide 1: Título' },
        { type: 'shape', subtype: 'body', value: 'Corpo do slide 1.' },
      ],
    },
    // Slide 2
    {
      type: 'slide',
      children: [{ type: 'shape', subtype: 'title', value: 'Slide 2: Apenas Título' }],
    },
    // Slide 3
    {
      type: 'slide',
      children: [
        { type: 'shape', subtype: 'title', value: 'Slide 3: Com Notas' },
        { type: 'shape', subtype: 'body', value: 'Corpo do slide 3.' },
        { type: 'shape', subtype: 'notes', value: 'Narração do slide 3 vinda das notas.' },
      ],
    },
  ],
};
