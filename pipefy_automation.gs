function main() {
// Token and pipe ID must be found at pipefy
// This function was create to automate the process of extractind data from pipefy's API and putting it in the spreadsheet
  
  var token = "TOKEN"
  var pipeID = "PIPE ID"
  var sheetName = "NAME OF THE SHEET"
  const link = 'https://api.pipefy.com/queries';
  var sheet = SpreadsheetApp.getActiveSpreadsheet();

  
  fillData(link,pipeID,sheetName,token);

}

function fillData(link,pipeId,sheetName,token){
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var spreadsheet = sheet.getSheetByName(sheetName);
  var coluna = spreadsheet.getLastColumn();
  
  var quantity = quantityFunc(pipeId,token,link);
  var json = [];
  var repeat = false;
  var next;
  [json,repeat,next] = getCards(pipeId,token,link,quantity,repeat,json)
  while(repeat){
    [json,repeat,next] = getCards(pipeId,token,link,quantity,repeat,json,next)
  }

  var valoresBusca = spreadsheet.getRange(1,1,1,coluna).getValues();
  var arr = filling(json,valoresBusca,quantity);

  // Puts value in spreadsheet
  spreadsheet.getRange(2,1,quantity+10,valoresBusca[0].length).clearContent();
  spreadsheet.getRange(2,1,quantity,valoresBusca[0].length).setValues(arr);
}


function filling(json,campos,quantity){
   var arr = new Array(quantity);            
    for (var i = 0; i < quantity; i++) {
      arr[i] = new Array(campos[0].length).fill('');        
    }

  for (key in json){
    var title = json[key].node.title;
    var phase = json[key].node.current_phase.name;
    var id = json[key].node.id;
    arr[key][0] = id;
    arr[key][1] = title;
    arr[key][2] = phase;
    for (times in json[key].node.phases_history){
      var nome = json[key].node.phases_history[times].phase.name;
      var nomeCompleto = `Primeira vez que entrou na phase ${nome}`;
      if(campos[0].includes(nomeCompleto)){
        var index = campos[0].indexOf(nomeCompleto);
        var firstTime = json[key].node.phases_history[times].firstTimeIn;
        var result = Date.parse(firstTime)/(1000*60*60*24)+25569;
        arr[key][index] = result;
      }
      }
    for (field in json[key].node.fields ){
      var name = json[key].node.fields[field].name;
      if(campos[0].includes(name)){
        var index = campos[0].indexOf(name);
        var firstTime = json[key].node.fields[field].value;
        if (firstTime != null){
          arr[key][index] = (firstTime.replace('["','').replace('"]','').replace('"',''));
        }
        
      }
    }
  }

  return arr
}

function getCards(pipeId,token,link,quantity,repeat,allData,next){
  if(repeat == true){
    var allCards = `{allCards(pipeId: ${pipeId}, first: ${quantity}, after: "${next}"){ 
      edges{
        node{
          id
          title
          current_phase { name }
          fields { name value }
          phases_history { phase { name } firstTimeIn }
        }
        }
        pageInfo { endCursor hasNextPage }
        }
      }`;
  }
  else{
    var allCards = `{allCards(pipeId: ${pipeId}, first: ${quantity}){ 
    edges{
      node{
        id
        title
        current_phase { name }
        fields { name value }
        phases_history { phase { name } firstTimeIn }
      }
      }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  }
  
  const params = {
  method: 'POST',
  link,
  payload: JSON.stringify({query: allCards}),
  headers: {
    'authorization': 'Bearer '+token,
    'Content-Type': 'application/json'}
  };

  var response = UrlFetchApp.fetch(link, params);
  var json = JSON.parse(response.getContentText()).data.allCards;
  var various = json.pageInfo.hasNextPage;
  
  if(various){
    var nextPipe = json.pageInfo.endCursor;
  }
  
  
  for (node in json.edges){
      allData.push(json.edges[node])
  }
  return [allData,various,nextPipe];

}

function quantityFunc(pipeId, token,link){
  var allPipes = `
    {pipe(id: ${pipeId}){ 
    name
	  cards_count
	}
}
  `
  const params = {
    method: 'POST',
    link,
    payload: JSON.stringify({query: allPipes}),
    headers: {
      'authorization': 'Bearer '+token,
      'Content-Type': 'application/json'}
  };

var response = UrlFetchApp.fetch(link, params);
var json = response.getContentText();
var data = JSON.parse(json);
return parseInt(data.data.pipe.cards_count);

}