document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const chatWindow = document.getElementById('chatbot-window');
    const messagesContainer = document.getElementById('chatbot-messages');
    const inputField = document.getElementById('chatbot-input-field');
    const sendBtn = document.getElementById('chatbot-send');

    let hasGreeted = false;

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.add('open');
        if (!hasGreeted) {
            setTimeout(() => {
                addMessage("Dạ, mình chào bạn! Cảm ơn bạn đã quan tâm đến Khóa đào tạo HLV chuyên sâu cho Nữ giới - HerFit Trainer K1. Bạn đang muốn tìm hiểu thêm về lộ trình học, hay đang băn khoăn điều gì về nghề PT, cứ thoải mái chia sẻ để mình hỗ trợ nhé!", 'bot');
                hasGreeted = true;
            }, 500);
        }
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('open');
    });

    const qaData = [
        {
            keywords: ['dạy', 'nội dung', 'kiến thức', 'học gì'],
            answer: 'Khóa K1 đào tạo chuyên sâu về huấn luyện vóc dáng chuẩn nữ giới. Bạn sẽ học kiến thức y khoa, giải phẫu sinh lý phái đẹp và đặc biệt là tư duy "dịch vụ tử tế mang lại giá trị thật". Tụi mình không dạy cách ép sale, mà hướng dẫn bạn tư vấn bằng sự thấu cảm.'
        },
        {
            keywords: ['bao lâu', 'thời gian', 'tháng'],
            answer: 'Lộ trình kéo dài 1 tháng, với 40% lý thuyết chuẩn khoa học và 60% thực hành trực tiếp tại phòng tập của HerFit để bạn cọ xát thực tế ngay lập tức.'
        },
        {
            keywords: ['giá', 'học phí', 'tiền', 'bao nhiêu'],
            answer: 'Giá gốc của khóa học là 15.000.000 VNĐ. Nhưng hiện tại HerFit đang có chương trình học bổng 50% cho 10 bạn đăng ký sớm nhất, học phí chỉ còn 7.500.000 VNĐ thôi bạn nhé.'
        },
        {
            keywords: ['chưa tập', 'con số 0', 'mới bắt đầu'],
            answer: 'Hoàn toàn được nhé! Lộ trình được thiết kế bài bản từ con số 0. Chỉ cần bạn có đam mê và khao khát mang lại giá trị thật cho khách hàng, mọi kỹ năng chuyên môn tụi mình sẽ hướng dẫn chi tiết.'
        },
        {
            keywords: ['đắt', 'cao', 'bên khác rẻ'],
            answer: 'Tụi mình thấu hiểu băn khoăn của bạn. Mức giá này nhỉnh hơn vì tụi mình không chỉ dạy cách nâng tạ, mà trang bị cho bạn tư duy nắm bắt tâm lý khách hàng nữ. Khi bạn biết cách làm dịch vụ tử tế, chỉ cần có được 1-2 khách hàng trân trọng giá trị bạn mang lại là dư sức thu hồi học phí rồi.'
        },
        {
            keywords: ['vđv', 'thi đấu', 'đối thủ'],
            answer: 'Rất nhiều nơi đào tạo thế mạnh về thể hình thi đấu. Nhưng mục tiêu của HerFit K1 là đào tạo HLV phục vụ khách hàng đại chúng (dân văn phòng, mẹ bỉm). Tụi mình tập trung vào sự tinh tế, môi trường an toàn và kiến thức chuyên biệt cho nữ giới chứ không nhồi nhét tạ nặng.'
        },
        {
            keywords: ['nữ', 'phụ nữ', 'cạnh tranh'],
            answer: 'Không hề bất lợi, mà đó là một đặc quyền. Đặc quyền của phái đẹp là sự tinh tế và thấu cảm. Thị trường hiện đang rất khát những HLV nữ tâm lý, biết chân thành lắng nghe để tạo ra môi trường tập luyện không body shaming.'
        },
        {
            keywords: ['giao tiếp', 'ít nói'],
            answer: 'HLV giỏi không phải là người khéo ăn nói, mà là người biết đặt cái tâm vào nghề. Khóa học sẽ giúp bạn bán hàng tự nhiên, chốt khách bằng chính sự tận tâm và chuyên môn của bạn.'
        },
        {
            keywords: ['việc làm', 'hỗ trợ', 'làm việc'],
            answer: 'Dạ có! Những học viên xuất sắc sẽ được giữ lại làm việc trực tiếp tại chuỗi hệ thống HerFit Wellness. Khi bạn làm việc bằng sự tử tế, cơ hội luôn rộng mở.'
        },
        {
            keywords: ['đăng ký', 'mua', 'giữ chỗ', 'form'],
            answer: 'Mình thấy định hướng của bạn rất phù hợp với giá trị mà HerFit đang xây dựng. Cơ hội nhận học bổng 50% (chỉ còn 7.500.000 VNĐ) chỉ còn vài suất, bạn tranh thủ đăng ký tại đây nhé: <br><a href="https://academy.levansy.com" target="_blank" class="chat-btn-link">ĐĂNG KÝ DANH SÁCH CHỜ</a>'
        },
        {
            keywords: ['nghĩ', 'phân vân', 'từ từ', 'xem xét'],
            answer: 'Mình hoàn toàn hiểu những trăn trở của bạn. Nếu bạn vẫn đang phân vân xem nghề này có thực sự hợp với mình không, cứ để lại thông tin tại https://academy.levansy.com nhé. Tụi mình sẽ liên hệ để tư vấn định hướng riêng cho trường hợp của bạn, chưa đăng ký học ngay cũng không sao cả. Tụi mình luôn sẵn sàng lắng nghe!'
        }
    ];

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-msg', sender);
        msgDiv.innerHTML = text;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function handleUserInput() {
        const text = inputField.value.trim();
        if (text === '') return;

        addMessage(text, 'user');
        inputField.value = '';

        setTimeout(() => {
            let responded = false;
            const lowerText = text.toLowerCase();

            for (let item of qaData) {
                if (item.keywords.some(kw => lowerText.includes(kw))) {
                    addMessage(item.answer, 'bot');
                    responded = true;
                    break;
                }
            }

            if (!responded) {
                addMessage('Dạ, mình hiểu. Tụi mình sẽ cần trao đổi kỹ hơn để hỗ trợ bạn tốt nhất. Bạn vui lòng để lại thông tin tại đây nhé, đội ngũ HerFit sẽ liên hệ lại ngay: <br><a href="https://academy.levansy.com" target="_blank" class="chat-btn-link">TƯ VẤN THÊM</a>', 'bot');
            }
        }, 600);
    }

    sendBtn.addEventListener('click', handleUserInput);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput();
    });
});
