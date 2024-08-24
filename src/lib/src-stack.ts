import { CfnOutput, Fn, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Vpc,
  SubnetType,
  InterfaceVpcEndpointService,
  IpAddresses,
} from "aws-cdk-lib/aws-ec2";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import {
  CfnCustomerGateway,
  CfnEIP,
  CfnRoute,
  CfnVPCGatewayAttachment,
  CfnVPNConnection,
  CfnVPNGateway,
  InterfaceVpcEndpoint,
} from "aws-cdk-lib/aws-ec2";

interface SrcStackProps extends StackProps {
  psk: string;
}

export class SrcStack extends Stack {
  public customerGatewayIp: string;
  public eip: string;

  constructor(scope: Construct, id: string, props: SrcStackProps) {
    super(scope, id, props);

    // VPC の作成（2つのアベイラビリティゾーンを使用）
    const vpc = new Vpc(this, "Vpc", {
      maxAzs: 2,
      ipAddresses: IpAddresses.cidr("10.1.0.0/16"),
      subnetConfiguration: [
        {
          subnetType: SubnetType.PRIVATE_ISOLATED,
          name: "PrivateSubnet",
          cidrMask: 24,
        },
      ],
    });

    // EIP
    this.eip = new CfnEIP(this, "ec2eip").ref;
    new CfnOutput(this, "InstancePublicIp", {
      value: this.eip, // Elastic IPの値を出力
    });

    // DynamoDB テーブルの作成
    const dynamoTable = new Table(this, "DynamoDBTable", {
      tableName: "VpnDynamoDbTable",
      partitionKey: { name: "id", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // VGWの作成
    /*
    const vpnGateway = new CfnVPNGateway(this, "VGW", {
      type: "ipsec.1",
      amazonSideAsn: 65000, // 必要に応じてAS番号を設定
    });

    // VPCにVGWをアタッチ
    new CfnVPCGatewayAttachment(this, "VPCGatewayAttachment", {
      vpcId: vpc.vpcId,
      vpnGatewayId: vpnGateway.attrVpnGatewayId,
    });
    */

    // DynamoDB用インターフェース型VPCエンドポイントの作成
    /*
    const dynamoDbEndpoint = new InterfaceVpcEndpoint(
      this,
      "DynamoDBEndpoint",
      {
        vpc: vpc,
        service: new InterfaceVpcEndpointService(
          `com.amazonaws.${this.region}.dynamodb`
        ),
        subnets: {
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      }
    );
    */

    // EC2からVGWを経由してアクセスするためのネットワーク経路を作成
    /*
    const privateSubnets = vpc.isolatedSubnets;
    privateSubnets.map((subnet, index) => {
      new CfnRoute(this, `RouteToVGW_${index + 1}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: "10.2.0.0/16", // 必要に応じて変更
        gatewayId: vpnGateway.attrVpnGatewayId,
      });
    });
    */

    /*
    // カスタマーゲートウェイ
    const customerGateway = new CfnCustomerGateway(this, "CustomerGateway", {
      bgpAsn: 65001,
      ipAddress: this.eip, // EC2に割り当てるElastic IP
      type: "ipsec.1",
    });
    this.customerGatewayIp = customerGateway.ipAddress;

    // VPN接続
    new CfnVPNConnection(this, "VPNConnection", {
      type: "ipsec.1",
      customerGatewayId: customerGateway.ref,
      vpnGatewayId: vpnGateway.attrVpnGatewayId,
      staticRoutesOnly: true,
      vpnTunnelOptionsSpecifications: [
        {
          preSharedKey: props.psk,
        },
      ],
    });

    // エンドポイントのDNS名を出力
    new CfnOutput(this, "DynamoDBEndpointDnsNameAZ", {
      value: Fn.join("\n", dynamoDbEndpoint.vpcEndpointDnsEntries),
      description: "DynamoDB Interface Endpoint DNS Name for AZ",
    });
    */
  }
}
