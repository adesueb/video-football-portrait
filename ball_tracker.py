import cv2
from ultralytics import YOLO

from definitions import object_white_listed


def draw_bounding_box(location, img, color):
    x = location[0]
    y = location[1]
    w = int(location[2])
    h = int(location[3])
    x = int(x - (w / 2))
    y = int(y - (h / 2))
    cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)


def draw_text(location, img, label, color):
    x = location[0]
    y = location[1]
    w = int(location[2])
    h = int(location[3])
    x = int(x - (w / 2))
    y = int(y - (h / 2))
    (w, h), _ = cv2.getTextSize(
        label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)

    cv2.rectangle(img, (x, y - 20), (x + w, y), color, -1)
    cv2.putText(img, label, (x, y - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)


def custom_checking_default(base_img, img, model):
    results = model(base_img, verbose=False)
    names = results[0].names
    boxes = results[0].boxes
    balls = []
    for (xywh, cls, conf) in zip(boxes.xywh, boxes.cls, boxes.conf):
        object_name = names[int(cls.item())]
        if object_name in object_white_listed:
            red = 255 / (int(str(hash(object_name))[1]) + 1)
            green = 255 / (int(str(hash(object_name))[2]) + 1)
            blue = 255 / (int(str(hash(object_name))[3]) + 1)

            draw_bounding_box(xywh, img, (red, green, blue))
            draw_text(xywh, img, object_name + ": " + str(conf.item()), (red, green, blue))
            balls.append([xywh, conf])
    return balls


def compare_histograms(frame1, frame2):
    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)

    hist1 = cv2.calcHist([gray1], [0], None, [256], [0, 256])
    hist2 = cv2.calcHist([gray2], [0], None, [256], [0, 256])

    hist1 = cv2.normalize(hist1, hist1)
    hist2 = cv2.normalize(hist2, hist2)
    score = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
    return score



if __name__ == '__main__':

    # model_default = YOLO('model/yolov8m-football.pt')
    model_default = YOLO('model/yolo_l.pt')
    video_path = "videos/football.mp4"
    cap = cv2.VideoCapture(video_path)

    frame_sequence = 1
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    frame_number = 0
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    success, image = cap.read()

    fps = cap.get(cv2.CAP_PROP_FPS)

    moving = 30
    moving_to_center = 60
    desired_aspect_ratio = 2 / 3
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    new_width = height * desired_aspect_ratio
    x_start = int(max(0, ((width / 2) - (new_width / 2))))

    size = (int(new_width), int(height))
    result = cv2.VideoWriter('filename.avi',
                             cv2.VideoWriter_fourcc(*'XVID'),
                             fps, size)

    max_x = width-new_width
    prev_frame = None

    while success and frame_number <= frame_count:
        frame_number += frame_sequence
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        success, frame = cap.read()
        if success:
            balls = custom_checking_default(frame, frame, model_default)

            if len(balls) > 0:
                xywh, conf = max(balls, key=lambda item: item[1])
                x = xywh[0]
                w = xywh[2]
                x = int(x - (w / 2))

                new_width = height * desired_aspect_ratio

                x_start_temp = min(max_x, max(0, (x - (new_width / 2))))

                if prev_frame is not None:
                    similarity = compare_histograms(prev_frame, frame)
                    if similarity < 0.8:
                        x_start = x_start_temp
                    else:
                        x_start = x_start - ((x_start - x_start_temp) / moving)
                else:
                    x_start = x_start_temp
            else:
                x_start_temp = (width/2) - (new_width / 2)
                x_start = x_start - ((x_start - x_start_temp) / moving_to_center)

            y_start = (height - height) // 2
            x_end = x_start + new_width
            y_end = (y_start + height)

            prev_frame = frame

            frame = frame[int(y_start):int(y_end), int(x_start):int(x_end)]

            result.write(frame)
            cv2.imshow("Vidio AI", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        else:
            break

    cap.release()
    result.release()
    cv2.destroyAllWindows()

