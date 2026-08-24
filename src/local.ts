import { handler } from "./index";

const runLocalTest = async () => {
  console.log("-----------------------------------------");
  console.log("Iniciando prueba local de la funcion Lambda...");
  console.log("-----------------------------------------");

  const fakeEvent = {};
  const fakeContext: any = {
    callbackWaitsForEmptyEventLoop: true
  };

  const response = await handler(fakeEvent, fakeContext);
  console.log("\nResultado retornado por la Lambda:");
  console.log("Status Code:", response.statusCode);
  console.log("Body:", JSON.parse(response.body));
  console.log("-----------------------------------------");

  process.exit(0);
};

runLocalTest();
