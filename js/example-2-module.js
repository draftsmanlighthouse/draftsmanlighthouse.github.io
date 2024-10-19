document.addEventListener('alpine:init', () => {
    Alpine.data('notesModule', function(){
        return {
            async init(){
                const bookIndex = await SearchIndex.open('books', {
                    fields: ['title', 'author'],
                    storeFields: ['title', 'author']
                  });

                  // Creëer een aparte index voor artikelen
                  const articleIndex = await SearchIndex.open('articles', {
                    fields: ['title', 'content'],
                    storeFields: ['title', 'content']
                  });
//                  const books = [
//                    { id: 1, title: 'The Catcher in the Rye', author: 'J.D. Salinger' },
//                    { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee' },
//                  ];
//
//                  await bookIndex.addDocuments(books);
//                  const articles = [
//                    { id: 1, title: 'JavaScript Promises', content: 'Promises are a way to handle async code.' },
//                    { id: 2, title: 'Web Workers', content: 'Web Workers allow you to run JavaScript in background threads.' },
//                  ];
//
//                  await articleIndex.addDocuments(articles);

                  // Voer zoekopdrachten uit
                  const bookResults = await bookIndex.search('Mockingbird');
                  console.log('Book search results:', bookResults);

                  const articleResults = await articleIndex.search('Promises');
                  console.log('Article search results:', articleResults);
            }
        }
    });
});