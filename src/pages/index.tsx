import { useState, useEffect } from 'react';
import Head from 'next/head'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import { message } from 'antd';
import { ethers } from 'ethers';
import {
  GaslessWalletConfig,
} from "@gelatonetwork/gasless-wallet";
import {
  GaslessOnboarding,
  GaslessWalletInterface,
  LoginConfig,
} from "@gelatonetwork/gasless-onboarding";

const inter = Inter({ subsets: ['latin'] })

// NEED 1Balance API KEY
const gaslessWalletConfig: GaslessWalletConfig = {
  apiKey: "-----YOUR-API-KEY-----",
};

// NEED Goerli Provider RPC
const loginConfig: LoginConfig = {
  chain: {
    id: 5,
    rpcUrl: "-----YOUR-RPC-URL-----",
  },
  openLogin: {
    redirectUrl: `http://localhost:3000/`,
  },
  domains: []
};

const gaslessOnboarding = new GaslessOnboarding(
  loginConfig,
  gaslessWalletConfig
);

import { UserInfo } from "@web3auth/base";
import { Button, Loading, Image, Text, Link } from "@nextui-org/react";
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [logined, setLogined] = useState(false);
  const [userInfo, setUserInfo] = useState<Partial<UserInfo>>({});
  const [address, setAddress] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const initGaslessOnboarding = async () => {
      setLoading(true);
      await gaslessOnboarding.init();
      const userinfoJSON = localStorage.getItem("userinfo")
      console.log("localstorage:", userinfoJSON);
      if (userinfoJSON !== "") {
        console.log("autologin");
        await login();
      }
      setLoading(false);
    }
    initGaslessOnboarding();
  }, [])

  async function login() {
    setLoading(true);
    const web3AuthProvider = await gaslessOnboarding.login();
    const provider = new ethers.providers.Web3Provider(web3AuthProvider);
    const uInfo = await gaslessOnboarding.getUserInfo();
    localStorage.setItem("userinfo", JSON.stringify(uInfo));
    setUserInfo(uInfo);
    const gaslessWallet: GaslessWalletInterface = gaslessOnboarding.getGaslessWallet();
    setAddress(gaslessWallet.getAddress());
    setLogined(true);
    setLoading(false);
  }

  function UserInfoView() {
    async function onboard() {
      await login();
    }

    async function logout() {
      setLoading(true);
      await gaslessOnboarding.logout();
      setUserInfo({});
      setAddress("");
      setLogined(false);
      setLoading(false);
    }

    return (
      <div>
        { !logined && 
          <Button shadow color="primary" onClick={() => loading ? {} : onboard()}>
            {loading ? <Loading color="white"></Loading> : "Login"}
          </Button>
        }
        { logined && <Button shadow color="error" onClick={() => loading ? {} : logout()}>Logout</Button>}
      </div>
    );
  }

  function UserAddress() {
    return (
      <div>
        { address ? <Text>Your Wallet : {address}</Text>: <Text h3>Connect Your Social Media -{'>'} </Text> }
      </div>
    )
  }

  function UserAvatar() {
    const [minted, setMinted] = useState(false);
    const [mintLoading, setMintLoading] = useState(false);
    const abi = [
      "function mintItem(address to, string memory uri) public returns (uint256)",
      "function balanceOf(address owner) view returns (uint256)"
    ];

    async function mintNFT() {
      setMintLoading(true);
      const nftContractAddress = "0x7F89049385e48b251848Defcb58d7F96CBB7ABe1"
      const gaslessWallet: GaslessWalletInterface = gaslessOnboarding.getGaslessWallet();
      const p = gaslessOnboarding.getProvider()
      const provider = new ethers.providers.Web3Provider(p as any);
      const contract = new ethers.Contract(nftContractAddress, abi, provider);

      const toAddress = gaslessWallet.getAddress();
      const itemURL = userInfo.profileImage;

      const balance = await contract.balanceOf(toAddress);
      if (balance.toNumber() > 0) {
        console.log("already minted");
        setMintLoading(false);
        setMinted(true)
        return
      }

      const functionData = contract.interface.encodeFunctionData('mintItem', [toAddress, itemURL]);
      console.log("functionData", functionData)

      const res = await gaslessWallet.sponsorTransaction(nftContractAddress, functionData);
      messageApi.open({
        type: 'success',
        content: 'Successfully minted NFT',
      })
      setMintLoading(false);
      setMinted(true)
    }

    return (
      <div>
        <div><Text h2 className={styles.text}>{userInfo.typeOfLogin}</Text></div>
        <div>
          {userInfo && userInfo.profileImage &&
            <Image width={150} height={150} objectFit="fill" src={userInfo.profileImage}></Image>
          }
        </div>
        <div><Text h3 className={styles.text}>{userInfo.name}</Text></div>
        <div>{ logined && <div>{ minted ? <><Text className={styles.text}>Already Minted!</Text><Link href={"https://goerli.etherscan.io/token/0x7F89049385e48b251848Defcb58d7F96CBB7ABe1?a="+address}><Button>Check On-chain</Button></Link></> 
                      : <Button shadow color="gradient" className={styles.mintnft} onClick={() => mintNFT()}>{mintLoading ? <Loading color="white"></Loading> : "MINT MY NFT"}</Button>}</div>}
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Web3 Quickstart</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.description}>
          <div><Text h2 className={styles.text}>Web3QSTRT</Text></div>
          <UserAddress></UserAddress>
          <UserInfoView></UserInfoView>
        </div>

        <div className={styles.center}>
          <div><UserAvatar></UserAvatar></div>
        </div>
        <div>
          <Text h1 className={styles.text}>More Features Coming Soon ...</Text>
        </div>
        <div>Powered by Gelato</div>
      </main>
    </>
  )
}
