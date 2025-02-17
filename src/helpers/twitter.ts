interface TwitterInfo {
  username: string;
  password: string;
  email: string;
}
export async function checkTwitterInfo(params: TwitterInfo) {
  if (!params.username || !params.password || !params.email) {
    return false;
  }
}
