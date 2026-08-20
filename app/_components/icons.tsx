import { type IconBaseProps, type IconType } from "react-icons";
import {
  LuArrowLeft,
  LuArrowRight,
  LuArrowUpRight,
  LuArchive,
  LuBellRing,
  LuBedDouble,
  LuBookOpen,
  LuBookOpenText,
  LuBadgeCheck,
  LuBarcode,
  LuBriefcaseMedical,
  LuCamera,
  LuCalendarDays,
  LuCat,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheckBig,
  LuCircleDashed,
  LuCircleOff,
  LuClock,
  LuChartNoAxesCombined,
  LuDog,
  LuFlower2,
  LuEyeOff,
  LuEye,
  LuFileImage,
  LuFlag,
  LuHouse,
  LuIdCard,
  LuImagePlus,
  LuInfo,
  LuLockKeyhole,
  LuLogIn,
  LuLogOut,
  LuMapPin,
  LuMegaphone,
  LuMessageCircle,
  LuMenu,
  LuPlus,
  LuPalette,
  LuPawPrint,
  LuPhone,
  LuQrCode,
  LuRotateCcw,
  LuSave,
  LuShare2,
  LuSearch,
  LuSend,
  LuScanLine,
  LuScissors,
  LuSettings,
  LuShieldCheck,
  LuShieldAlert,
  LuShieldOff,
  LuSmartphone,
  LuSparkles,
  LuSticker,
  LuStore,
  LuSwatchBook,
  LuTicket,
  LuTrash2,
  LuTriangleAlert,
  LuUserRound,
  LuUserRoundCheck,
  LuUsersRound,
  LuVideo,
  LuWalletCards,
  LuWifiOff,
  LuX,
} from "react-icons/lu";
import { FcGoogle } from "react-icons/fc";

type MeawIconProps = IconBaseProps & {
  weight?: "bold" | "duotone" | "fill" | "thin";
};

const normalizeIconSize = (size: IconBaseProps["size"]) => {
  if (typeof size !== "number") return size;
  if (size <= 16) return 16;
  if (size <= 21) return 20;
  if (size <= 27) return 24;
  if (size <= 35) return 32;
  if (size <= 48) return 40;
  if (size <= 72) return 64;
  return 80;
};

function meawIcon(Icon: IconType) {
  return function MeawIcon({ weight, size, strokeWidth = 2.15, ...props }: MeawIconProps) {
    void weight;
    return <Icon aria-hidden="true" focusable="false" size={normalizeIconSize(size)} strokeWidth={strokeWidth} {...props} />;
  };
}


export const ArrowClockwise = meawIcon(LuRotateCcw);
export const ArrowLeft = meawIcon(LuArrowLeft);
export const ArrowRight = meawIcon(LuArrowRight);
export const ArrowUpRight = meawIcon(LuArrowUpRight);
export const Archive = meawIcon(LuArchive);
export const BadgeCheck = meawIcon(LuBadgeCheck);
export const Barcode = meawIcon(LuBarcode);
export const BellRinging = meawIcon(LuBellRing);
export const BedDouble = meawIcon(LuBedDouble);
export const BookOpen = meawIcon(LuBookOpen);
export const BookOpenText = meawIcon(LuBookOpenText);
export const Camera = meawIcon(LuCamera);
export const CalendarDays = meawIcon(LuCalendarDays);
export const Cat = meawIcon(LuCat);
export const Check = meawIcon(LuCheck);
export const ChevronDown = meawIcon(LuChevronDown);
export const ChevronRight = meawIcon(LuChevronRight);
export const CircleAlert = meawIcon(LuCircleAlert);
export const CheckCircle = meawIcon(LuCircleCheckBig);
export const CircleDashed = meawIcon(LuCircleDashed);
export const CircleOff = meawIcon(LuCircleOff);
export const Clock = meawIcon(LuClock);
export const Chart = meawIcon(LuChartNoAxesCombined);
export const Dog = meawIcon(LuDog);
export const Flower = meawIcon(LuFlower2);
export const Google = meawIcon(FcGoogle);
export const Eye = meawIcon(LuEye);
export const EyeSlash = meawIcon(LuEyeOff);
export const FileImage = meawIcon(LuFileImage);
export const Flag = meawIcon(LuFlag);
export const FirstAidKit = meawIcon(LuBriefcaseMedical);
export const House = meawIcon(LuHouse);
export const IdentificationCard = meawIcon(LuIdCard);
export const ImagePlus = meawIcon(LuImagePlus);
export const Info = meawIcon(LuInfo);
export const List = meawIcon(LuMenu);
export const LockKey = meawIcon(LuLockKeyhole);
export const LogIn = meawIcon(LuLogIn);
export const LogOut = meawIcon(LuLogOut);
export const MapPin = meawIcon(LuMapPin);
export const Megaphone = meawIcon(LuMegaphone);
export const MessageCircle = meawIcon(LuMessageCircle);
export const Palette = meawIcon(LuPalette);
export const PawPrint = meawIcon(LuPawPrint);
export const Phone = meawIcon(LuPhone);
export const Plus = meawIcon(LuPlus);
export const QrCode = meawIcon(LuQrCode);
export const Save = meawIcon(LuSave);
export const Share = meawIcon(LuShare2);
export const Search = meawIcon(LuSearch);
export const Send = meawIcon(LuSend);
export const Scan = meawIcon(LuScanLine);
export const Scissors = meawIcon(LuScissors);
export const Settings = meawIcon(LuSettings);
export const ShieldCheck = meawIcon(LuShieldCheck);
export const ShieldAlert = meawIcon(LuShieldAlert);
export const ShieldOff = meawIcon(LuShieldOff);
export const Smartphone = meawIcon(LuSmartphone);
export const Sparkle = meawIcon(LuSparkles);
export const Sticker = meawIcon(LuSticker);
export const Storefront = meawIcon(LuStore);
export const Swatches = meawIcon(LuSwatchBook);
export const Ticket = meawIcon(LuTicket);
export const Trash = meawIcon(LuTrash2);
export const TriangleAlert = meawIcon(LuTriangleAlert);
export const UserRound = meawIcon(LuUserRound);
export const UserRoundCheck = meawIcon(LuUserRoundCheck);
export const UsersRound = meawIcon(LuUsersRound);
export const Video = meawIcon(LuVideo);
export const Wallet = meawIcon(LuWalletCards);
export const WifiOff = meawIcon(LuWifiOff);
export const X = meawIcon(LuX);
