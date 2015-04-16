

var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var moment = require('moment');
var fs = require('fs');
var toMarkdown = require('to-markdown');
var path = require('path');

var config = {
  server: 'server-ip-address',
  userName: 'davidfekke',
  password: 'password',
  options: {
    debug: {
      packet: true,
      data: true,
      payload: true,
      token: false,
      log: true
    },
    database: 'Orchard'
  }
};

var connection = new Connection(config);

connection.on('connect', function(err) {
    // If no error, then good to go...
    executeStatement();
  }
);

connection.on('debug', function(text) {
    //console.log(text);
  }
);

function executeStatement() {
  request = new Request("select  rpr.Title as title, rpr.Slug as permalink, CAST(bpr.[text] AS VARCHAR(MAX)) AS [body], cpr.PublishedUtc as published_at, substring((select ','+ttr.TagName  AS [text()] from dbo.Orchard_Tags_ContentTagRecord ctr JOIN dbo.Orchard_Tags_TagRecord ttr ON ctr.TagRecord_id = ttr.id WHERE ctr.TagsPartRecord_id = cir.id For XML PATH ('')), 2, 1000) AS Tags from dbo.Orchard_Framework_ContentItemRecord cir JOIN dbo.Common_BodyPartRecord bpr ON cir.id = bpr.ContentItemRecord_id AND bpr.id = (SELECT MAX(bpr2.id) FROM dbo.Common_BodyPartRecord bpr2 WHERE bpr2.ContentItemRecord_id = cir.id) JOIN dbo.common_CommonPartRecord cpr ON cir.id = cpr.id JOIN dbo.Routable_RoutePartRecord rpr ON rpr.ContentItemRecord_id = cir.id where cir.ContentType_id = 8;", 
	function(err, rowCount) {
    if (err) {
      console.log(err);
    } else {
      console.log(rowCount + ' rows');
    }

    connection.close();
  });

  request.on('row', function(columns) {
    console.log(columns[0].value);
	var publishDate = moment(columns[3].value).format('YYYY-MM-DD');
	//var md = toMarkdown(columns[2].value);
	writeMDPost(columns[1].value, columns[0].value, publishDate, columns[2].value, columns[4].value);
    console.log('writting post');
	
  });

  request.on('done', function(rowCount, more) {
    console.log(rowCount + ' rows returned');
  });

  // In SQL Server 2000 you may need: connection.execSqlBatch(request);
  connection.execSql(request);
}

// ---
// layout: post
// title: "I am moving my website over to Jekyll"
// category: "Jekyll"
// tags: [Jekyll]
//---
// {% include JB/setup %}
function writeMDPost(slug, title, pubdate, htmlbody, tags) {
	var md = toMarkdown(htmlbody);
	var stream = fs.createWriteStream(path.join(process.cwd(), pubdate + '-' + slug + '.markdown'));
	stream.on('open', function(fd) {
		stream.write("---\n");
		stream.write('layout: post\n');
		stream.write('title: "' + title + '"\n');
		stream.write('category: "Blog"\n');
		if (tags !== null) {
			stream.write('tags: [' + tags + ']\n');
		}
		stream.write("---\n");
		stream.write("{% include JB/setup %}\n");
		stream.write("\n");
		stream.write(md);
		stream.end();
	});
}