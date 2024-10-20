var api_url = "";
var api_ws = "";
var api_key = "";
var bucket = "";
var stage = ""

if (!localStorage["staging-environment"] || localStorage["staging-environment"] == "false"){
//	console.log("Connected to production");
//	stage = "production";
//	bucket = "d6nw9ezmq1s2u.cloudfront.net";
//	localStorage["aws-congnito-user-pool-id"] = "eu-west-2_54wVzyDa2";
//	localStorage["aws-congnito-app-id"] = "8v5ld51pljr6qj2ml4k7teleq";
//	localStorage["aws-congnito-ui"] = "https://livedemo-production-jm5o4z.auth.eu-west-2.amazoncognito.com";	api_url = "https://ypmmyzhhhbcd7glgwzy4u4dwn4.appsync-api.eu-west-2.amazonaws.com/graphql";
//	api_ws = "wss://ypmmyzhhhbcd7glgwzy4u4dwn4.appsync-realtime-api.eu-west-2.amazonaws.com/graphql";
//	api_key = "da2-3pizhs4zsndnbbo4cxuiuwm7nu";
    console.log("Connected to staging");
	stage = "staging";
	bucket = "d35s1t8mxwqfv0.cloudfront.net";
	localStorage["aws-congnito-user-pool-id"] = "eu-west-2_X6onWn8p0";
	localStorage["aws-congnito-app-id"] = "a75m2981lvl652cdkqp66k66r";
	localStorage["aws-congnito-ui"] = "https://livedemo-staging-hob0cx.auth.eu-west-2.amazoncognito.com";
	api_url = "https://et2ab5wwx5drflfwja5eluibxm.appsync-api.eu-west-2.amazonaws.com/graphql";
	api_ws = "wss://et2ab5wwx5drflfwja5eluibxm.appsync-realtime-api.eu-west-2.amazonaws.com/graphql";
	api_key = "da2-zcmhifu3mvespg226hlgoduyfu";
}