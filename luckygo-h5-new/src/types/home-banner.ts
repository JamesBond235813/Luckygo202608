/** 首页轮播第 3 屏及以后：由后台配置，前端按此结构渲染 */
/** 整图 Banner 建议尺寸：9:5（如 360×200、720×400），展示高度固定 200px */
export type HomeBannerSlideRemote = {
    id: string;
    /** 整图 Banner（文案/按钮已做进图里时只传 imageUrl + linkTo） */
    imageUrl?: string;
    /** 可选：图外叠加文案（旧模式）；整图模式留空即可 */
    title?: string;
    subtitle?: string;
    actionLabel?: string;
    /** 站内路由如 /invite，或完整外链 */
    linkTo?: string;
};
