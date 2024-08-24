import { App, CfnOutput } from "aws-cdk-lib";
import { CfnEIP } from "aws-cdk-lib/aws-ec2";
import { SrcStack } from "../lib/src-stack";
import { ClientStack } from "../lib/client-stack";

const app = new App();

// EIP
const eip = new CfnEIP(app, "ec2eip");
new CfnOutput(app, "InstancePublicIp", {
  value: eip.ref, // Elastic IPの値を出力
});

// VPN Connection Preshared Key
const psk = "a12345";

// VPC A
const srcStack = new SrcStack(app, "SrcStack", {
  // 事前に作成したElastic IPを指定
  eip: eip.ref,
  // 事前共有鍵
  psk: psk,
});

// VPC B
new ClientStack(app, "ClientStack", {
  eip: eip.ref,
  customerGatewayIp: srcStack.customerGatewayIp,
  // 事前共有鍵
  psk: psk,
});
