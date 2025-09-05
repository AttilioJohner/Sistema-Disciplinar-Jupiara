// Estrutura de Medidas Disciplinares Categorizadas
const MEDIDAS_DISCIPLINARES = {
    leves: [
        "1. Apresentar-se com uniforme diferente do estabelecido pelo regulamento do uniforme",
        "2. Apresentar-se com barba ou bigode sem fazer",
        "3. Comparecer à EECM com cabelo em desalinho ou fora do padrão estabelecido pelas diretrizes dos Uniformes",
        "4. Chegar atrasado a EECM para o início das aulas, instrução, treinamento, formatura ou atividade escolar",
        "5. Comparecer a EECM sem levar o material necessário",
        "6. Adentrar ou permanecer em qualquer dependência da EECM, sem autorização",
        "7. Consumir alimentos, balas, doces líquidos ou mascar chicletes durante a aula, instrução, treinamento, formatura, atividade escolar, e nas dependências da EECM, salvo quando devidamente autorizado",
        "8. Conversar ou se mexer quando estiver em forma",
        "9. Deixar de entregar à Monitoria, Secretaria ou a Coordenação, qualquer objeto que não lhe pertença que tenha encontrado na EECM",
        "10. Deixar de retribuir cumprimentos ou de prestar sinais de respeito regulamentares, previstos no Manual do Aluno",
        "11. Deixar material escolar, objetos ou peças de uniforme em locais inapropriados dentro ou fora da unidade escolar",
        "12. Descartar papéis, restos de comida, embalagens ou qualquer objeto no chão ou fora de locais apropriados",
        "13. Dobrar qualquer peça de uniforme para diminuir seu tamanho, desfigurando sua originalidade",
        "14. Debruçar-se sobre a carteira e dormir durante o horário das aulas ou instruções",
        "15. Executar movimentos de ordem unida de forma displicente ou desatenciosa",
        "16. Fazer ou provocar excessivo barulho em qualquer dependência da EECM, durante o horário de aula",
        "17. Não levar ao conhecimento de autoridade competente falta ou irregularidade que presenciar ou de que tiver ciência",
        "18. Perturbar o estudo do(s) colega(s), com ruídos ou brincadeiras",
        "19. Utilizar-se, na sala, de qualquer publicação estranha a sua atividade escolar, salvo quando autorizado",
        "20. Retardar ou contribuir para o atraso da execução de qualquer atividade sem justo motivo",
        "21. Sentar-se no chão, atentando contra a postura e compostura, estando uniformizado, exceto quando em aula de educação Física",
        "22. Utilizar qualquer tipo de jogo, brinquedo, figurinhas, coleções no interior da EECM",
        "23. Usar, a aluna, piercings, brinco fora do padrão estabelecido, mais de um brinco em cada orelha, alargador ou similares, quando uniformizado, durante a aula, instrução, treinamento, formatura ou atividade escolar",
        "24. Usar, o aluno, piercings, brinco, alargador ou similares, quando uniformizado, durante a aula, instrução, treinamento, formatura ou atividade escolar",
        "25. Usar, quando uniformizado, boné, capuz ou outros adornos, durante a atividade escolar",
        "26. Ficar na sala de aula durante os intervalos e as formaturas diárias"
    ],
    medias: [
        "27. Atrasar ou deixar de atender ao chamado da Diretoria, coordenação, Oficial de Gestão Educacional-Militar, o Oficial de Gestão Cívico-Militar, Monitores, professores ou servidores no exercício de sua função",
        "28. Deixar de comparecer a qualquer atividade extraclasse para a qual tenha sido designado, exceto quando devidamente justificado",
        "29. Deixar de comparecer às atividades escolares, formaturas, ou delas se ausentar, sem autorização",
        "30. Deixar de cumprir ou esquivar-se de medidas disciplinares impostas pelo Gestor Educacional-Militar",
        "31. Deixar de devolver à EECM, dentro do prazo estipulado, documentos devidamente assinados pelo seu responsável",
        "32. Deixar de devolver, no prazo fixado, livros da biblioteca ou outros materiais pertencentes às EECM",
        "33. Deixar de entregar ao pai ou responsável, documento que lhe foi encaminhado pela EECM",
        "34. Deixar de executar tarefas atribuídas da Diretoria, coordenação, Oficial de Gestão Educacional-Militar, o Oficial de Gestão Cívico-Militar, Monitores, professores ou servidores no exercício de sua função",
        "35. Deixar de zelar por sua apresentação pessoal",
        "36. Dirigir memoriais ou petições a qualquer autoridade, sobre assuntos da alçada da Diretoria e do Oficial de Gestão Educacional-Militar",
        "37. Entrar ou sair da EECM por locais não permitidos",
        "38. Espalhar boatos ou notícias tendenciosas por qualquer meio",
        "39. Tocar a sirene, sem ordem para tal",
        "40. Fumar dentro ou nas imediações da EECM ou quando uniformizado",
        "41. Ingressar ou sair da EECM sem estar com o uniforme regulamentar, bem como trocar de roupa (trajes civis) dentro da EECM ou em suas mediações",
        "42. Ler ou distribuir, dentro da EECM, publicações estampas ou jornais que atentem contra a disciplina, a moral e a ordem pública",
        "43. Manter contato físico que denote envolvimento de cunho amoroso (namoro, beijos, etc.) quando devidamente uniformizado, dentro da EECM ou fora dele",
        "44. Não zelar pelo nome da Instituição que representa, deixando de portar-se adequadamente em qualquer ambiente, quando uniformizado ou em atividades relacionadas a EECM",
        "45. Negar-se a colaborar ou participar nos eventos, formaturas, solenidades, desfiles oficiais da EECM",
        "46. Ofender o moral de colegas ou de qualquer membro da Comunidade Escolar por atos, gestos ou palavras",
        "47. Portar-se de forma inconveniente em sala de aula ou outro local de instrução/recreação, bem como transportes de uso coletivo",
        "48. Portar-se de maneira desrespeitosa ou inconveniente nos eventos sociais ou esportivos, promovidos ou com a participação da EECM ou fora dela",
        "49. Proferir palavras de baixo calão, incompatíveis com as normas da boa educação, ou grafá-las em qualquer lugar",
        "50. Propor ou aceitar transação pecuniária de qualquer natureza, no interior da EECM, sem a devida autorização",
        "51. Provocar ou disseminar a discórdia entre colegas",
        "52. Publicar ou contribuir para que sejam publicadas mensagens, fotos, vídeos ou qualquer outro documento, na Internet ou qualquer outro meio de comunicação, que possam expor a integrante da EECM",
        "53. Retirar ou tentar retirar objeto, de qualquer dependência da EECM, ou mesmo deles servir-se, sem ordem do responsável e/ou do proprietário",
        "54. Sair de forma sem autorização",
        "55. Sair, entrar ou permanecer na sala de aula sem permissão",
        "56. Ser retirado, por mau comportamento, de sala de aula ou qualquer ambiente em que esteja sendo realizada atividade",
        "57. Simular doença para esquivar-se ao atendimento de obrigações e de atividades escolares",
        "58. Tomar parte em jogos de azar ou em apostas na unidade escolar ou fora dela, uniformizados ou não",
        "59. Usar as instalações ou equipamentos esportivos do EECM, sem uniformes adequados, ou sem autorização",
        "60. Usar o uniforme ou o nome do EECM em ambiente inapropriado",
        "61. Utilizar, sem autorização, telefones celulares ou quaisquer aparelhos eletrônicos ou não, durante as atividades escolares",
        "62. Usar indevidamente distintivos ou insígnias"
    ],
    graves: [
        "63. Assinar pelo responsável, documento que deva ser entregue à unidade escolar",
        "64. Causar danos ao patrimônio da unidade escolar",
        "65. Causar ou contribuir para a ocorrência de acidentes de qualquer natureza",
        "66. Comunicar-se com outro aluno ou utilizar-se de qualquer meio não permitido durante qualquer instrumento de avaliação",
        "67. Denegrir o nome da EECM e/ou de qualquer de seus membros através de procedimentos desrespeitosos, seja por palavras, gestos, meio virtual ou outros",
        "68. Desrespeitar, desobedecer ou desafiar a Diretoria, coordenação, Oficial de gestão Educacional-Militar, o Oficial de Gestão Cívico-Militar, Monitores, professores ou servidores unidade escolar",
        "69. Divulgar, ou concorrer para que isso aconteça, qualquer imagem ou matéria que induza a apologia às drogas, à violência e/ou pornografia",
        "70. Entrar na unidade escolar, ou dela se ausentar, sem autorização",
        "71. Extraviar documentos que estejam sob sua responsabilidade",
        "72. Faltar com a verdade e/ou utilizar-se do anonimato para a prática de qualquer falta disciplinar",
        "73. Fazer uso, portar, distribuir, estar sob ação ou induzir outrem ao uso de bebida alcoólica, entorpecentes, tóxicos ou produtos alucinógenos, no interior da EECM, em suas imediações estando ou não uniformizado",
        "74. Hastear ou arriar bandeiras e estandartes, sem autorização",
        "75. Instigar colegas a cometer faltas disciplinares e/ou ações delituosas que comprometam o bom nome da EECM",
        "76. Manter contato físico com denotação libidinosa no ambiente da EECM ou fora dela",
        "77. Obter ou fazer uso de imagens, vídeos, áudios ou de qualquer tipo de publicação difamatória contra qualquer membro da Comunidade Escolar",
        "78. Ofender membros da Comunidade Escolar com a prática de Bullying e Cyberbullying",
        "79. Pichar ou causar qualquer poluição visual ou sonora dentro e nas proximidades da EECM",
        "80. Portar objetos que ameacem a segurança individual e/ou da coletividade",
        "81. Praticar atos contrários ao culto e ao respeito aos símbolos nacionais",
        "82. Promover ou tomar parte de qualquer manifestação coletiva que venha a macular o nome da EECM e/ou que prejudique o bom andamento das aulas e/ou avaliações",
        "83. Promover trote de qualquer natureza",
        "84. Promover, incitar ou envolver-se em rixa, inclusive luta corporal, dentro ou fora da EECM, estando ou não uniformizado",
        "85. Provocar ou tomar parte, uniformizado ou estando na EECM, em manifestações de natureza política",
        "86. Rasurar, violar ou alterar documento ou o conteúdo dos mesmos",
        "87. Representar a EECM e/ou por ela tomar compromisso, sem estar para isso autorizado",
        "88. Ter em seu poder, introduzir, ler ou distribuir, dentro da EECM, cartazes, jornais ou publicações que atentem contra a disciplina e/ou o moral ou de cunho político-partidário",
        "89. Utilizar ou subtrair indevidamente objetos ou valores alheios",
        "90. Utilizar-se de processos fraudulentos na realização de trabalhos pedagógicos",
        "91. Utilizar-se indevidamente e/ou causar avariar e/ou destruição do patrimônio pertencente a EECM"
    ]
};

// Função para criar select de medidas por categoria
function criarSelectMedidas(categoria) {
    const medidas = MEDIDAS_DISCIPLINARES[categoria];
    if (!medidas) return '';
    
    const options = medidas.map(medida => 
        `<option value="${medida}">${medida}</option>`
    ).join('');
    
    return `
        <select class="form-control select-medida-${categoria}" id="selectMedida${categoria.charAt(0).toUpperCase() + categoria.slice(1)}">
            <option value="">Selecione uma falta ${categoria === 'medias' ? 'média' : categoria.slice(0, -1)}...</option>
            ${options}
        </select>
    `;
}

// Exportar para uso global
window.MEDIDAS_DISCIPLINARES = MEDIDAS_DISCIPLINARES;
window.criarSelectMedidas = criarSelectMedidas;