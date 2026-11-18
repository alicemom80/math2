// 세로로 들었을 때 앱 화면을 90도 돌려 가로처럼 보여 주므로(base.css), 화면 위의 좌표를 무대 안 좌표로 바꿔 주는 도우미
const ROTATED_QUERY = '(orientation: portrait) and (pointer: coarse)';

export const isRotated = () => typeof matchMedia === 'function' && matchMedia(ROTATED_QUERY).matches;

/** 화면에서 손가락이 움직인 양(dx, dy)을 무대 안 방향으로 바꾼다. (시계 방향 90도: 무대 가로 = 화면 아래, 무대 세로 = 화면 왼쪽) */
export function toStageDelta(dx, dy) {
  return isRotated() ? { dx: dy, dy: -dx } : { dx, dy };
}

/** 화면 위 사각형 r 안에서 점(x, y)이 어디쯤인지 무대 방향 비율(0~1)로 */
export function toStageFraction(r, x, y) {
  return isRotated()
    ? { fx: (y - r.top) / r.height, fy: (r.right - x) / r.width }
    : { fx: (x - r.left) / r.width, fy: (y - r.top) / r.height };
}
