/**
 * Kubernetes kubeconfig 파일 형식에 맞는 TypeScript 인터페이스 정의
 * https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
 */

/**
 * Cluster 정보
 */
export interface ClusterConfig {
  /**
   * Kubernetes API 서버 URL
   */
  server: string;
  /**
   * Base64로 인코딩된 CA 인증서
   */
  'certificate-authority-data'?: string;
  /**
   * CA 인증서 파일 경로
   */
  'certificate-authority'?: string;
  /**
   * TLS 서버 이름 (SNI)
   */
  'tls-server-name'?: string;
  /**
   * TLS 검증 비활성화 여부 (권장하지 않음)
   */
  'insecure-skip-tls-verify'?: boolean;
  /**
   * 프록시 URL
   */
  'proxy-url'?: string;
  /**
   * 추가 확장 필드
   */
  extensions?: Array<{
    name: string;
    extension: unknown;
  }>;
}

/**
 * Cluster 항목
 */
export interface Cluster {
  /**
   * Cluster 이름
   */
  name: string;
  /**
   * Cluster 설정
   */
  cluster: ClusterConfig;
}

/**
 * User 인증 정보
 */
export interface UserAuth {
  /**
   * Base64로 인코딩된 클라이언트 인증서
   */
  'client-certificate-data'?: string;
  /**
   * 클라이언트 인증서 파일 경로
   */
  'client-certificate'?: string;
  /**
   * Base64로 인코딩된 클라이언트 키
   */
  'client-key-data'?: string;
  /**
   * 클라이언트 키 파일 경로
   */
  'client-key'?: string;
  /**
   * Bearer 토큰
   */
  token?: string;
  /**
   * 사용자 이름 (기본 인증)
   */
  username?: string;
  /**
   * 비밀번호 (기본 인증)
   */
  password?: string;
  /**
   * Exec 명령어 (예: aws eks get-token)
   */
  exec?: {
    /**
     * Exec API 버전
     */
    apiVersion: string;
    /**
     * 실행할 명령어
     */
    command: string;
    /**
     * 명령어 인자
     */
    args?: string[];
    /**
     * 환경 변수
     */
    env?: Array<{
      name: string;
      value: string;
    }>;
    /**
     * 추가 설정
     */
    [key: string]: unknown;
  };
  /**
   * Auth Provider 설정
   */
  'auth-provider'?: {
    name: string;
    config: Record<string, string>;
  };
  /**
   * 추가 확장 필드
   */
  extensions?: Array<{
    name: string;
    extension: unknown;
  }>;
}

/**
 * User 항목
 */
export interface User {
  /**
   * User 이름
   */
  name: string;
  /**
   * User 인증 정보
   */
  user: UserAuth;
}

/**
 * Context 설정
 */
export interface ContextConfig {
  /**
   * 사용할 Cluster 이름
   */
  cluster: string;
  /**
   * 사용할 User 이름
   */
  user: string;
  /**
   * 기본 Namespace
   */
  namespace?: string;
  /**
   * 추가 확장 필드
   */
  extensions?: Array<{
    name: string;
    extension: unknown;
  }>;
}

/**
 * Context 항목
 */
export interface Context {
  /**
   * Context 이름
   */
  name: string;
  /**
   * Context 설정
   */
  context: ContextConfig;
}

/**
 * Kubeconfig 설정
 */
export interface KubeConfig {
  /**
   * API 버전 (일반적으로 'v1')
   */
  apiVersion: 'v1';
  /**
   * 리소스 종류 (항상 'Config')
   */
  kind: 'Config';
  /**
   * 기본 설정
   */
  preferences?: {
    colors?: boolean;
    [key: string]: unknown;
  };
  /**
   * 현재 사용 중인 Context 이름
   */
  'current-context'?: string;
  /**
   * Cluster 목록
   */
  clusters: Cluster[];
  /**
   * Context 목록
   */
  contexts: Context[];
  /**
   * User 목록
   */
  users: User[];
}
