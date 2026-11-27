# Football site — conceito em quatro cenas

Experiência estática, sem banco ou login, para publicação na Vercel. Os quatro originais completos fornecidos pelo usuário foram preparados em 1280×720, H.264, CRF 12 e quadros independentes para busca rápida. A resolução, ordem e todos os 190/61/89/41 quadros foram preservados. As versões `hd-v1` somam aproximadamente 31,6 MB; os originais não foram alterados.

Abra `index.html` por um servidor local, por exemplo `python3 -m http.server 4173`, e acesse `http://localhost:4173`. Na Vercel, importe este repositório como projeto **Other**, com diretório de saída `.` e sem comando de build.

As quatro cenas têm a mesma distância: 1,2 altura de viewport para percorrer cada vídeo e uma faixa de 48–80px para passar pela sombra até o próximo, sem sobrepor as imagens. A última usa essa faixa para revelar a assinatura. O vídeo fica pausado e o scroll controla seu quadro, inclusive ao voltar. Legendas ficam totalmente visíveis de 30% a 84%. No celular, a proporção 16:9 preserva bola e chuteira. Movimento reduzido usa posters e textos estáticos.
